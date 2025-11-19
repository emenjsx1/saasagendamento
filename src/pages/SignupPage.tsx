import React, { useState, useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { Navigate, Link, useParams } from 'react-router-dom';
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
  planSlug: string; // Novo campo para o slug
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
    planSlug: 'trial',
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
    planSlug: 'weekly',
  },
  {
    name: 'Plano Mensal',
    price: 529.20,
    billingPeriod: 'por mês',
    isTrial: false,
    features: [
      'Tudo do Plano Semanal',
      'Desconto de 10%',
      'Gestão Financeira Completa',
      'Notificações por E-mail',
      'Suporte Prioritário',
    ],
    planKey: 'monthly',
    planSlug: 'monthly',
  },
  {
    name: 'Plano Anual',
    price: 4586.40,
    billingPeriod: 'por ano',
    isTrial: false,
    features: [
      'Tudo do Plano Mensal',
      'Desconto de 40% (Melhor Valor)',
      'Relatórios Avançados',
      'Integração WhatsApp (Futuro)',
      'Consultoria de Setup',
    ],
    planKey: 'annual',
    planSlug: 'annual',
  },
];

const SignupPage: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const { planSlug } = useParams<{ planSlug: string }>();
  
  // Encontra o plano baseado no slug da URL, ou usa o Trial como fallback
  const initialPlan = pricingPlans.find(p => p.planSlug === planSlug) || pricingPlans.find(p => p.planKey === 'trial')!;
  
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>(initialPlan);
  const [step, setStep] = useState<'plan_selection' | 'auth' | 'payment'>('auth'); // Começa direto no Auth se o slug for válido
  const [isProcessing, setIsProcessing] = useState(false);

  // Se o slug for inválido, forçamos a seleção de plano
  useEffect(() => {
    if (!planSlug || !pricingPlans.find(p => p.planSlug === planSlug)) {
        setStep('plan_selection');
    } else {
        // Se o slug for válido, garantimos que o plano correto está selecionado
        setSelectedPlan(initialPlan);
        setStep('auth');
    }
  }, [planSlug]);


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
      status: isTrial ? 'active' : 'pending_payment', 
    };

    const { error } = await supabase
      .from('subscriptions')
      .insert(subscriptionData);

    setIsProcessing(false);

    if (error) {
      toast.error("Erro ao registrar o plano. Por favor, entre em contato com o suporte.");
      console.error("Subscription error:", error);
    } else {
      toast.success(isTrial ? "Teste gratuito ativado! Bem-vindo(a)!" : "Plano selecionado. Prossiga para o pagamento.");
    }
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
    <div className="space-y-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-center">Escolha seu Plano</h2>
      <p className="text-center text-gray-600">Selecione o plano que deseja iniciar.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <Zap className="h-3 w-3 mr-1" /> Teste Gratuito
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
                {plan.features.slice(0, 3).map((feature, index) => (
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
                onClick={() => {
                    setSelectedPlan(plan);
                    setStep('auth');
                }}
              >
                {selectedPlan.planKey === plan.planKey ? 'Continuar com este Plano' : 'Escolher Plano'}
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
        Cadastro: {selectedPlan.name}
      </h2>
      <p className="text-center text-sm text-muted-foreground mb-4">
        {selectedPlan.isTrial ? 'Inicie seu teste gratuito de 3 dias.' : 'Prossiga para criar sua conta e finalizar o pagamento.'}
      </p>
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
    </div>
  );
};

export default SignupPage;