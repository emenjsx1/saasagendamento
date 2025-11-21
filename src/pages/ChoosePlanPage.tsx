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

const ChoosePlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  const { subscriptionConfig, isLoading: isConfigLoading } = usePublicSettings();
  const { currentCurrency, T } = useCurrency();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  const pricingPlans = subscriptionConfig ? generatePricingPlans(subscriptionConfig, currentCurrency) : [];

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

  const handleSelectPlan = (plan: PricingPlan) => {
    // Redirecionar diretamente para checkout com o plano selecionado
    navigate(`/checkout/${plan.slug}`);
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
                >
                  {T('Escolher Plano', 'Choose Plan')}
                  <ArrowRight className="ml-2 h-4 w-4" />
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

