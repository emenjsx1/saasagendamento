import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/integrations/supabase/session-context';
import { usePublicSettings } from '@/hooks/use-public-settings';
import { useCurrency } from '@/contexts/CurrencyContext';
import { generatePricingPlans, PricingPlan } from '@/utils/pricing-plans';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { addDays } from 'date-fns';
import { refreshConsolidatedUserData } from '@/utils/user-consolidated-data';
import { ensureBusinessAccount } from '@/utils/business-helpers';

const ChoosePlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  const { subscriptionConfig, isLoading: isConfigLoading } = usePublicSettings();
  const { currentCurrency, T } = useCurrency();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const allPlans = subscriptionConfig ? generatePricingPlans(subscriptionConfig, currentCurrency) : [];
  // Filtrar plano Free - não mostrar na página de escolha (só aparece após registro ou em links diretos)
  const pricingPlans = allPlans.filter(plan => plan.planKey !== 'free' && plan.planSlug !== 'free');

  useEffect(() => {
    if (!isSessionLoading && !user) {
      toast.error(T("Você precisa estar logado para escolher um plano.", "You need to be logged in to choose a plan."));
      navigate('/register', { replace: true });
    }
  }, [user, isSessionLoading, navigate, T]);

  if (isSessionLoading || isConfigLoading || !subscriptionConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!user) {
      toast.error(T("Você precisa estar logado para escolher um plano.", "You need to be logged in to choose a plan."));
      navigate('/register');
      return;
    }

    // Garantir que conta seja marcada como BUSINESS antes de escolher plano
    // Planos são apenas para área de negócios
    try {
      const businessId = await ensureBusinessAccount(user.id);
      if (!businessId) {
        toast.warning(T("Aviso: Não foi possível marcar conta como BUSINESS. Continuando...", "Warning: Could not mark account as BUSINESS. Continuing..."));
      }
    } catch (error) {
      console.warn('⚠️ Erro ao garantir business account (não crítico):', error);
      // Continuar mesmo se falhar
    }

    // Se for o plano FREE (3 dias), criar subscription direto e ir para dashboard
    if (plan.planKey === 'free' || plan.planSlug === 'free') {
      setIsProcessing(true);
      
      try {
        // Verificar se já tem subscription ativa
        const { data: existingSubscription } = await supabase
          .from('subscriptions')
          .select('id, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingSubscription && (existingSubscription.status === 'active' || existingSubscription.status === 'trial')) {
          toast.info(T("Você já possui uma assinatura ativa. Redirecionando...", "You already have an active subscription. Redirecting..."));
          navigate('/dashboard');
          return;
        }

        // ⚠️ VALIDAÇÃO: Verificar se o usuário JÁ teve um teste gratuito antes
        // Buscar TODAS as subscriptions do usuário (não apenas ativas) para verificar histórico de trial
        const { data: allSubscriptions } = await supabase
          .from('subscriptions')
          .select('id, is_trial, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Verificar se já teve algum trial no histórico
        const hasTrialHistory = allSubscriptions?.some(sub => sub.is_trial === true) || false;

        if (hasTrialHistory) {
          toast.error(T(
            "Você já utilizou seu teste gratuito. O teste gratuito pode ser ativado apenas uma vez por conta.",
            "You have already used your free trial. The free trial can only be activated once per account."
          ));
          setIsProcessing(false);
          // Redirecionar para escolher outro plano
          return;
        }

        // Criar subscription FREE com trial de 3 dias
        const trialEndsAt = addDays(new Date(), 3).toISOString();
        
        const subscriptionData = {
          user_id: user.id,
          plan_name: plan.name,
          price: 0,
          is_trial: true,
          trial_ends_at: trialEndsAt,
          status: 'trial',
          created_at: new Date().toISOString(),
        };

        const { error: subError } = await supabase
          .from('subscriptions')
          .insert(subscriptionData);

        if (subError) {
          console.error("Erro ao criar subscription FREE:", subError);
          throw subError;
        }

        // Atualizar tabela consolidada
        try {
          await refreshConsolidatedUserData(user.id);
        } catch (error) {
          console.warn('⚠️ Erro ao atualizar tabela consolidada (não crítico):', error);
        }

        toast.success(T("Conta ativada com sucesso! Redirecionando para o dashboard...", "Account activated successfully! Redirecting to dashboard..."));
        
        // Redirecionar para dashboard
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);

      } catch (error: any) {
        console.error("Erro ao ativar plano FREE:", error);
        toast.error(error.message || T("Erro ao ativar plano. Tente novamente.", "Error activating plan. Please try again."));
        setIsProcessing(false);
      }
    } else {
      // Para outros planos, ir para checkout
      navigate(`/checkout/${plan.slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {T('Escolha seu Plano', 'Choose Your Plan')}
          </h1>
          <p className="text-lg text-gray-600">
            {T('Selecione o plano que melhor se adapta às suas necessidades', 'Select the plan that best fits your needs')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingPlans.map((plan) => (
            <Card 
              key={plan.slug} 
              className={`relative transition-all hover:shadow-xl cursor-pointer ${
                selectedPlan?.slug === plan.slug ? 'ring-2 ring-primary' : ''
              } ${plan.isPopular ? 'border-primary border-2' : ''}`}
              onClick={() => handleSelectPlan(plan)}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                    {T('Mais Popular', 'Most Popular')}
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">
                    {formatCurrency(plan.price, currentCurrency.key, currentCurrency.locale)}
                  </span>
                  {plan.period && (
                    <span className="text-gray-600 ml-2">/{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full mt-6" 
                  variant={plan.isPopular ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isProcessing}
                >
                  {isProcessing && (plan.planKey === 'free' || plan.planSlug === 'free') ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {T('Ativando...', 'Activating...')}
                    </>
                  ) : (
                    <>
                      {T('Escolher Plano', 'Choose Plan')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChoosePlanPage;

