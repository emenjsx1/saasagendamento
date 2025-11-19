import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Lock, Mail, User, Phone, MessageSquare, CreditCard, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { getPlanBySlug, calculateRenewalDate, PricingPlan, generatePricingPlans } from '@/utils/pricing-plans';
import { formatCurrency } from '@/lib/utils';
import { addDays } from 'date-fns';
import { usePublicSettings } from '@/hooks/use-public-settings';
import { useCurrency } from '@/contexts/CurrencyContext'; // Import useCurrency

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
  name_pt: string;
  name_en: string;
  icon: React.ReactNode;
  instructions_pt: string;
  instructions_en: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    key: 'mpesa',
    name_pt: 'M-Pesa',
    name_en: 'M-Pesa',
    icon: <Phone className="h-5 w-5 text-red-600" />,
    instructions_pt: "Instruções: Pague para o número XXXXXXXX via M-Pesa. Após o pagamento, clique em 'Verificar Pagamento'.",
    instructions_en: "Instructions: Pay to number XXXXXXXX via M-Pesa. After payment, click 'Verify Payment'.",
  },
  {
    key: 'emola',
    name_pt: 'e-Mola',
    name_en: 'e-Mola',
    icon: <MessageSquare className="h-5 w-5 text-green-600" />,
    instructions_pt: "Instruções: Pague para o número YYYYYYYY via e-Mola. Após o pagamento, clique em 'Verificar Pagamento'.",
    instructions_en: "Instructions: Pay to number YYYYYYYY via e-Mola. After payment, click 'Verify Payment'.",
  },
  { 
    key: 'card', 
    name_pt: 'Cartão Virtual', 
    name_en: 'Virtual Card', 
    icon: <CreditCard className="h-5 w-5 text-blue-600" />, 
    instructions_pt: "Em breve: Pagamento via cartão virtual.",
    instructions_en: "Coming soon: Virtual card payment.",
  },
];

const CheckoutPage: React.FC = () => {
  const { planSlug } = useParams<{ planSlug: string }>();
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  const { subscriptionConfig, isLoading: isConfigLoading } = usePublicSettings();
  const { currentCurrency, T } = useCurrency(); // Use currency context
  
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
  
  // Gera os planos dinamicamente
  const pricingPlans = subscriptionConfig ? generatePricingPlans(subscriptionConfig, currentCurrency) : [];
  const plan = getPlanBySlug(planSlug || '', pricingPlans);

  // Redirecionar se o plano for inválido ou se já estiver logado
  useEffect(() => {
    if (!isConfigLoading && !plan && !isSessionLoading) {
      toast.error(T("Plano não encontrado.", "Plan not found."));
      navigate('/#pricing', { replace: true });
    }
    if (user && !isSessionLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [plan, user, isSessionLoading, navigate, isConfigLoading, T]);

  if (!plan || isSessionLoading || isConfigLoading || !subscriptionConfig) {
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
            phone: values.phone, 
          },
        },
      });

      if (authError) throw authError;
      
      const userId = authData.user?.id;
      if (!userId) throw new Error("Falha ao obter ID do usuário.");

      // 2. Criar a subscrição com status 'pending_payment'
      const isTrial = plan.isTrial;
      const trialEndsAt = isTrial ? addDays(new Date(), subscriptionConfig.trial_days).toISOString() : null;
      
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

      // 3. Atualizar o perfil com dados adicionais (address)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          address: values.address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) console.error("Erro ao atualizar perfil:", profileError);
      
      setTempUserId(userId);

      if (isTrial) {
        // Se for trial, a subscrição está ativa. Redirecionar para o dashboard.
        toast.success(T("Teste gratuito ativado! Bem-vindo(a)!", "Free trial activated! Welcome!"));
        navigate('/dashboard', { replace: true });
      } else {
        // Se for pago, avança para o pagamento
        setStep('payment');
      }

    } catch (error: any) {
      toast.error(T("Erro ao criar conta: ", "Error creating account: ") + error.message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Lógica de Pagamento (Step 2) ---
  const handlePaymentVerification = async () => {
    if (!tempUserId || !selectedPaymentMethod || !plan) return;
    setIsSubmitting(true);

    // Simulação de verificação de pagamento (API Direta)
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // 1. Registrar o pagamento na tabela 'payments'
      const paymentRecord = {
        user_id: tempUserId,
        amount: plan.price,
        status: 'confirmed',
        payment_type: 'subscription',
        method: selectedPaymentMethod.key,
        transaction_id: `MOCK-${Date.now()}`, // ID de transação simulado
        notes: T(`Pagamento da assinatura ${plan.name}`, `Subscription payment for ${plan.name}`),
      };
      
      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentRecord);
        
      if (paymentError) throw paymentError;

      // 2. Atualizar status da subscrição para 'active'
      const { error: subUpdateError } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('user_id', tempUserId)
        .eq('status', 'pending_payment');

      if (subUpdateError) throw subUpdateError;

      // 3. Redirecionar para o sucesso
      
      toast.success(T("Pagamento verificado e conta ativada! Faça login para acessar o painel.", "Payment verified and account activated! Log in to access the dashboard."));
      setStep('success');

    } catch (error: any) {
      toast.error(T("Erro ao verificar pagamento. Tente novamente ou entre em contato com o suporte.", "Error verifying payment. Please try again or contact support."));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Renderização ---

  const renderAccountForm = () => (
    <Card className="shadow-xl h-full">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center"><User className="h-5 w-5 mr-2" /> {T('1. Crie sua Conta', '1. Create Your Account')}</CardTitle>
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
                    <FormLabel>{T('Primeiro Nome', 'First Name')} *</FormLabel>
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
                    <FormLabel>{T('Sobrenome', 'Last Name')} *</FormLabel>
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
                  <FormLabel>{T('E-mail', 'Email')} *</FormLabel>
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
                  <FormLabel>{T('Telefone (WhatsApp/M-Pesa)', 'Phone (WhatsApp/M-Pesa)')} *</FormLabel>
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
                  <FormLabel>{T('Endereço (Opcional)', 'Address (Optional)')}</FormLabel>
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
                    <FormLabel>{T('Criar Senha', 'Create Password')} *</FormLabel>
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
                    <FormLabel>{T('Confirmar Senha', 'Confirm Password')} *</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
              (plan.isTrial ? T('Iniciar Teste Gratuito', 'Start Free Trial') : T('Continuar para o Pagamento', 'Continue to Payment'))}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  const renderPaymentStep = () => (
    <Card className="shadow-xl h-full">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center"><Phone className="h-5 w-5 mr-2" /> {T('2. Escolha o Método de Pagamento', '2. Choose Payment Method')}</CardTitle>
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
              <span className="ml-3">{T(method.name_pt, method.name_en)}</span>
            </Button>
          ))}
        </div>

        {selectedPaymentMethod && (
          <div className="border p-4 rounded-lg bg-gray-50 space-y-3">
            <h4 className="font-semibold text-lg">{T('Instruções para', 'Instructions for')} {T(selectedPaymentMethod.name_pt, selectedPaymentMethod.name_en)}</h4>
            <p className="text-sm text-gray-700">{T(selectedPaymentMethod.instructions_pt, selectedPaymentMethod.instructions_en)}</p>
            
            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handlePaymentVerification}
              disabled={isSubmitting || selectedPaymentMethod.key === 'card'}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : T('Verificar Pagamento (Simulado)', 'Verify Payment (Simulated)')}
            </Button>
          </div>
        )}
        
        <Button variant="link" onClick={() => setStep('account')} className="p-0">
          <ArrowLeft className="h-4 w-4 mr-2" /> {T('Voltar e Editar Dados', 'Go Back and Edit Details')}
        </Button>
      </CardContent>
    </Card>
  );

  const renderSuccessStep = () => (
    <Card className="shadow-xl h-full text-center p-10">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <CardTitle className="text-3xl mb-2">{T('Conta Ativada!', 'Account Activated!')}</CardTitle>
      <p className="text-lg text-gray-600 mb-6">{T('Seu pagamento foi confirmado e sua conta está ativa. Faça login para começar.', 'Your payment has been confirmed and your account is active. Log in to access the dashboard.')}</p>
      <Button asChild size="lg">
        <a href="/login">{T('Acessar Painel de Gestão', 'Access Management Dashboard')}</a>
      </Button>
    </Card>
  );

  const renderCheckoutSummary = () => (
    <Card className="sticky top-8 shadow-xl border-t-4 border-primary/50">
      <CardHeader>
        <CardTitle className="text-xl">{T('Resumo da Compra', 'Order Summary')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 border-b pb-4">
          <div className="flex justify-between text-lg font-bold">
            <span>{T('Plano:', 'Plan:')}</span>
            <span className="text-primary">{plan.name}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{T('Recorrência:', 'Recurrence:')}</span>
            <span>{plan.billingPeriod}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{T('Próxima Renovação:', 'Next Renewal:')}</span>
            <span>{calculateRenewalDate(plan, subscriptionConfig.trial_days)}</span>
          </div>
        </div>
        
        {plan.originalPrice && (
            <div className="flex justify-between text-sm text-gray-500 line-through">
                <span>{T('Preço Original:', 'Original Price:')}</span>
                <span>{formatCurrency(plan.originalPrice, currentCurrency.key, currentCurrency.locale)}</span>
            </div>
        )}
        {plan.discount && (
            <div className="flex justify-between text-sm text-green-600 font-semibold">
                <span>{T(`Desconto (${plan.discount}%):`, `Discount (${plan.discount}%):`)}</span>
                <span>-{formatCurrency(plan.originalPrice! - plan.price, currentCurrency.key, currentCurrency.locale)}</span>
            </div>
        )}

        <div className="flex justify-between text-2xl font-extrabold pt-2 border-t border-dashed">
          <span>{T('Total a Pagar:', 'Total Due:')}</span>
          <span className="text-green-600">{formatCurrency(plan.price, currentCurrency.key, currentCurrency.locale)}</span>
        </div>
        
        <div className="pt-4 space-y-3">
            <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                <span>{T('Garantia de 7 dias.', '7-day guarantee.')}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
                <Lock className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                <span>{T('Pagamento Seguro SSL.', 'Secure SSL Payment.')}</span>
            </div>
            <Button variant="outline" className="w-full text-sm" asChild>
                <a href="https://wa.me/258123456789" target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="h-4 w-4 mr-2" /> {T('Suporte via WhatsApp', 'Support via WhatsApp')}
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
          {T('Finalizar Compra', 'Complete Purchase')}
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