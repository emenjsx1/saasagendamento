import React, { useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Zap } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

interface PricingPlan {
  name: string;
  price: number;
  billingPeriod: string;
  isTrial: boolean;
  features: string[];
  planKey: string;
}

const pricingPlans: PricingPlan[] = [
  {
    name: 'Teste Gratuito',
    price: 0,
    billingPeriod: 'por 3 dias',
    isTrial: true,
    features: [
      'Agendamentos Ilimitados',
      'Página de Agendamento Personalizada',
      'Gestão de Serviços',
      'Gestão Financeira Completa',
      'Relatórios Básicos',
      'Notificações por E-mail',
    ],
    planKey: 'trial',
  },
  {
    name: 'Plano Semanal',
    price: 147,
    billingPeriod: 'por semana',
    isTrial: false,
    features: [
      'Tudo do Teste Gratuito',
      'Suporte Padrão',
      'Sem expiração',
    ],
    planKey: 'weekly',
  },
];

const SignupPage: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>(pricingPlans[0]);
  const [step, setStep] = useState<'plan_selection' | 'auth' | 'payment'>('plan_selection');
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirecionar se já estiver logado
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Função para criar a subscrição após o cadastro (via Auth UI)
  const handleSubscriptionCreation = async (userId: string) => {
    setIsProcessing(true);
    
    const isTrial = selectedPlan.isTrial;
    const trialEndsAt = isTrial ? addDays(new Date(), 3).toISOString() : null;
    
    const subscriptionData = {
      user_id: userId,
      plan_name: selectedPlan.name,
      price: selectedPlan.price,
      is_trial: isTrial,
      trial_ends_at: trialEndsAt,
      status: isTrial ? 'active' : 'pending_payment', // Se for pago, fica pendente
    };

    // Se for teste, ativamos imediatamente. Se for pago, o status é 'pending_payment'
    if (isTrial) {
        subscriptionData.status = 'active';
    }

    const { error } = await supabase
      .from('subscriptions')
      .insert(subscriptionData);

    setIsProcessing(false);

    if (error) {
      toast.error("Erro ao registrar o plano. Por favor, entre em contato com o suporte.");
      console.error("Subscription error:", error);
      // Se falhar, o usuário pode ficar sem plano, mas a conta foi criada.
    } else {
      toast.success(isTrial ? "Teste gratuito ativado! Bem-vindo(a)!" : "Plano selecionado. Prossiga para o pagamento.");
    }
  };

  // Lógica de Pagamento (Simulação)
  const handlePayment = async () => {
    if (selectedPlan.isTrial) {
        // Se for teste, o Auth UI já deve ter criado o usuário. Redirecionamos.
        // Nota: A criação da subscrição deve ser feita após o SIGNUP.
        // Como o Auth UI não nos dá um hook direto para o signup, vamos confiar no redirecionamento
        // e no hook de sessão para pegar o usuário recém-criado.
        setStep('auth');
        return;
    }

    setIsProcessing(true);
    // Simulação de processamento de pagamento
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Após o pagamento (simulado), atualizamos o status da subscrição para 'active'
    // Nota: Esta lógica é complexa para ser feita aqui sem o ID do usuário.
    // Para simplificar o fluxo de cadastro, vamos usar o Auth UI para criar a conta
    // e depois lidar com a subscrição.

    // Por enquanto, vamos apenas para a tela de Auth para criar a conta.
    setStep('auth');
    setIsProcessing(false);
  };

  // Monitorar o estado de autenticação para criar a subscrição
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && step === 'auth') {
        // Se o usuário acabou de se cadastrar/logar, criamos a subscrição
        handleSubscriptionCreation(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [step]);


  const renderPlanSelection = () => (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-center">Escolha seu Plano</h2>
      <p className="text-center text-gray-600">Comece com nosso teste gratuito de 3 dias!</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pricingPlans.map((plan) => (
          <Card 
            key={plan.planKey} 
            className={cn(
              "flex flex-col transition-all duration-300 cursor-pointer hover:shadow-xl",
              selectedPlan.planKey === plan.planKey ? "border-2 border-primary shadow-lg" : "border border-gray-200"
            )}
            onClick={() => setSelectedPlan(plan)}
          >
            <CardHeader className="text-center pb-4">
              {plan.isTrial && (
                <div className="mx-auto mb-2 inline-flex items-center rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">
                  <Zap className="h-3 w-3 mr-1" /> Recomendado
                </div>
              )}
              <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
            </CardHeader>
            
            <CardContent className="flex-grow space-y-4 p-6">
              <div className="text-center">
                <p className="text-4xl font-extrabold text-primary">
                  {formatCurrency(plan.price)}
                </p>
                <p className="text-sm text-gray-600 mt-1">{plan.billingPeriod}</p>
              </div>

              <ul className="space-y-2 text-left text-sm">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-gray-700">
                    <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <div className="p-6 pt-0">
              <Button 
                size="lg" 
                className="w-full"
                onClick={() => setStep('auth')}
              >
                {selectedPlan.planKey === plan.planKey ? 'Selecionado' : 'Escolher Plano'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      
      <div className="text-center pt-4">
        <Link to="/login" className="text-sm text-primary hover:underline">Já tem uma conta? Faça login.</Link>
      </div>
    </div>
  );

  const renderAuth = () => (
    <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6">
        {selectedPlan.isTrial ? 'Crie sua Conta Gratuita' : `Cadastro para o Plano ${selectedPlan.name}`}
      </h2>
      <Auth
        supabaseClient={supabase}
        providers={[]}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: 'hsl(var(--primary))',
                brandAccent: 'hsl(var(--primary-foreground))',
              },
            },
          },
        }}
        theme="light"
        view="sign_up"
        redirectTo={window.location.origin + '/dashboard'}
        // Adicionamos campos de metadados para o perfil (opcional, mas bom para UX)
        // extraData={{ first_name: '', last_name: '' }} 
      />
      <div className="mt-4 text-center">
        <Button variant="link" onClick={() => setStep('plan_selection')}>
          &larr; Voltar para seleção de plano
        </Button>
      </div>
    </div>
  );

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      {step === 'plan_selection' && renderPlanSelection()}
      {step === 'auth' && renderAuth()}
      {/* Não precisamos de uma etapa de pagamento real por enquanto, o Auth UI redireciona */}
    </div>
  );
};

export default SignupPage;