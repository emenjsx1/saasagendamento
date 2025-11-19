import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Lock, Mail, User, Phone, MapPin, CheckCircle, ArrowLeft, MessageSquare, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { getPlanBySlug, calculateRenewalDate, PricingPlan } from '@/utils/pricing-plans';
import { formatCurrency } from '@/lib/utils';
import { addDays } from 'date-fns';

// --- Schemas ---
const AccountSchema = z.object({
  first_name: z.string().min(1, "Nome é obrigatório."),
  last_name: z.string().min(1, "Sobrenome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  phone: z.string().min(5, "Telefone é obrigatório (para M-Pesa/e-Mola)."),
  address: z.string().optional(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type AccountFormValues = z.infer<typeof AccountSchema>;

// --- Componentes de Passo ---

interface PaymentMethod {
  key: 'mpesa' | 'emola' | 'card';
  name: string;
  icon: React.ReactNode;
  instructions: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    key: 'mpesa',
    name: 'M-Pesa',
    icon: <Phone className="h-5 w-5 text-red-600" />,
    instructions: "Instruções: Pague para o número XXXXXXXX via M-Pesa. Após o pagamento, clique em 'Verificar Pagamento'.",
  },
  {
    key: 'emola',
    name: 'e-Mola',
    icon: <MessageSquare className="h-5 w-5 text-green-600" />,
    instructions: "Instruções: Pague para o número YYYYYYYY via e-Mola. Após o pagamento, clique em 'Verificar Pagamento'.",
  },
  { 
    key: 'card', 
    name: 'Cartão Virtual', 
    icon: <CreditCard className="h-5 w-5 text-blue-600" />, 
    instructions: "Em breve: Pagamento via cartão virtual.",
  },
];

const CheckoutPage: React.FC = () => {
  const { planSlug } = useParams<{ planSlug: string }>();
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  
  const plan = getPlanBySlug(planSlug || '');
  
  const [step, setStep] = useState<'account' | 'payment' | 'success'>('account');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [tempUserId, setTempUserId] = useState<string | null>(null); // Armazena o ID do usuário pendente

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(AccountSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      address: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Redirecionar se o plano for inválido ou se já estiver logado
  useEffect(() => {
    if (!plan && !isSessionLoading) {
      toast.error("Plano não encontrado.");
      navigate('/#pricing', { replace: true });
    }
    if (user && !isSessionLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [plan, user, isSessionLoading, navigate]);

  if (!plan || isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- Lógica de Criação de Conta (Step 1) ---
  const handleAccountCreation = async (values: AccountFormValues) => {
    setIsSubmitting(true);

    try {
      // 1. Criar o usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            first_name: values.first_name,
            last_name: values.last_name,
          },
        },
      });

      if (authError) throw authError;
      
      const userId = authData.user?.id;
      if (!userId) throw new Error("Falha ao obter ID do usuário.");

      // 2. Criar a subscrição com status 'pending_payment'
      const isTrial = plan.isTrial;
      const trialEndsAt = isTrial ? addDays(new Date(), 3).toISOString() : null;
      
      const subscriptionData = {
        user_id: userId,
        plan_name: plan.name,
        price: plan.price,
        is_trial: isTrial,
        trial_ends_at: trialEndsAt,
        status: isTrial ? 'active' : 'pending_payment', 
      };

      const { error: subError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData);

      if (subError) throw subError;

      // 3. Atualizar o perfil com dados adicionais (phone, address)
      // Nota: O trigger handle_new_user já criou o perfil, só precisamos atualizar.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: values.phone,
          address: values.address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) console.error("Erro ao atualizar perfil:", profileError);
      
      setTempUserId(userId);

      if (isTrial) {
        // Se for trial, a subscrição está ativa. Redirecionar para o dashboard.
        toast.success("Teste gratuito ativado! Bem-vindo(a)!");
        navigate('/dashboard', { replace: true });
      } else {
        // Se for pago, avança para o pagamento
        setStep('payment');
      }

    } catch (error: any) {
      toast.error("Erro ao criar conta: " + error.message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Lógica de Pagamento (Step 2) ---
  const handlePaymentVerification = async () => {
    if (!tempUserId) return;
    setIsSubmitting(true);

    // Simulação de verificação de pagamento (API Direta)
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // 1. Atualizar status da subscrição para 'active'
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('user_id', tempUserId)
        .eq('status', 'pending_payment');

      if (error) throw error;

      // 2. Redirecionar para o login (o usuário precisa fazer login após o pagamento)
      
      toast.success("Pagamento verificado e conta ativada! Faça login para acessar o painel.");
      setStep('success');

    } catch (error: any) {
      toast.error("Erro ao verificar pagamento. Tente novamente ou entre em contato com o suporte.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Renderização ---

  const renderAccountForm = () => (
    <Card className="shadow-xl h-full">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center"><User className="h-5 w-5 mr-2" /> 1. Crie sua Conta</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAccountCreation)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primeiro Nome</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sobrenome</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone (WhatsApp/M-Pesa)</FormLabel>
                  <FormControl><Input placeholder="(99) 99999-9999" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço (Opcional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Criar Senha</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
              (plan.isTrial ? 'Iniciar Teste Gratuito' : 'Continuar para o Pagamento')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  const renderPaymentStep = () => (
    <Card className="shadow-xl h-full">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center"><Phone className="h-5 w-5 mr-2" /> 2. Escolha o Método de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <Button
              key={method.key}
              variant={selectedPaymentMethod?.key === method.key ? 'default' : 'outline'}
              className="w-full justify-start h-12 text-base"
              onClick={() => setSelectedPaymentMethod(method)}
              disabled={method.key === 'card'} // Simulação de desativação
            >
              {method.icon}
              <span className="ml-3">{method.name}</span>
            </Button>
          ))}
        </div>

        {selectedPaymentMethod && (
          <div className="border p-4 rounded-lg bg-gray-50 space-y-3">
            <h4 className="font-semibold text-lg">Instruções para {selectedPaymentMethod.name}</h4>
            <p className="text-sm text-gray-700">{selectedPaymentMethod.instructions}</p>
            
            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handlePaymentVerification}
              disabled={isSubmitting || selectedPaymentMethod.key === 'card'}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verificar Pagamento (Simulado)'}
            </Button>
          </div>
        )}
        
        <Button variant="link" onClick={() => setStep('account')} className="p-0">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar e Editar Dados
        </Button>
      </CardContent>
    </Card>
  );

  const renderSuccessStep = () => (
    <Card className="shadow-xl h-full text-center p-10">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <CardTitle className="text-3xl mb-2">Conta Ativada!</CardTitle>
      <p className="text-lg text-gray-600 mb-6">Seu pagamento foi confirmado e sua conta está ativa. Faça login para começar.</p>
      <Button asChild size="lg">
        <a href="/login">Acessar Painel de Gestão</a>
      </Button>
    </Card>
  );

  const renderCheckoutSummary = () => (
    <Card className="sticky top-8 shadow-xl border-t-4 border-primary/50">
      <CardHeader>
        <CardTitle className="text-xl">Resumo da Compra</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 border-b pb-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Plano:</span>
            <span className="text-primary">{plan.name}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Recorrência:</span>
            <span>{plan.billingPeriod}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Próxima Renovação:</span>
            <span>{calculateRenewalDate(plan)}</span>
          </div>
        </div>
        
        {plan.originalPrice && (
            <div className="flex justify-between text-sm text-gray-500 line-through">
                <span>Preço Original:</span>
                <span>{formatCurrency(plan.originalPrice)}</span>
            </div>
        )}
        {plan.discount && (
            <div className="flex justify-between text-sm text-green-600 font-semibold">
                <span>Desconto ({plan.discount}%):</span>
                <span>-{formatCurrency(plan.originalPrice! - plan.price)}</span>
            </div>
        )}

        <div className="flex justify-between text-2xl font-extrabold pt-2 border-t border-dashed">
          <span>Total a Pagar:</span>
          <span className="text-green-600">{formatCurrency(plan.price)}</span>
        </div>
        
        <div className="pt-4 space-y-3">
            <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                <span>Garantia de 7 dias.</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
                <Lock className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                <span>Pagamento Seguro SSL.</span>
            </div>
            <Button variant="outline" className="w-full text-sm" asChild>
                <a href="https://wa.me/258123456789" target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="h-4 w-4 mr-2" /> Suporte via WhatsApp
                </a>
            </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
            <Link to="/" className="text-3xl font-bold text-primary">
                Agendamento SaaS
            </Link>
        </div>
        
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">
          Finalizar Compra
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Esquerda: Formulário/Pagamento */}
          <div className="lg:col-span-2 space-y-8">
            {step === 'account' && renderAccountForm()}
            {step === 'payment' && renderPaymentStep()}
            {step === 'success' && renderSuccessStep()}
          </div>

          {/* Coluna Direita: Resumo */}
          <div className="lg:col-span-1">
            {renderCheckoutSummary()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;