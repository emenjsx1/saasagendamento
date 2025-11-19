import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, formatCurrency } from '@/lib/utils';
import { generatePricingPlans } from '@/utils/pricing-plans';
import { usePublicSettings } from '@/hooks/use-public-settings'; // Importar hook

const PricingSection: React.FC = () => {
  const { subscriptionConfig, isLoading } = usePublicSettings();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!subscriptionConfig) {
      // Fallback ou erro, mas usePublicSettings garante defaults
      return null; 
  }

  const pricingPlans = generatePricingPlans(subscriptionConfig);
  
  // Filtra apenas os planos pagos para exibição na seção de preços
  const displayPlans = pricingPlans.filter(p => !p.isTrial);
  const trialPlan = pricingPlans.find(p => p.isTrial);

  return (
    <section id="pricing" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Plano único com tudo o que você precisa!</h2>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Escolha a frequência de pagamento que melhor se adapta ao seu fluxo de caixa.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {displayPlans.map((plan) => (
            <Card 
              key={plan.name} 
              className={cn(
                "flex flex-col transition-all duration-300 hover:shadow-xl",
                plan.isPopular ? "border-2 border-primary shadow-2xl scale-[1.02]" : "border border-gray-200 shadow-lg"
              )}
            >
              <CardHeader className="text-center pb-4">
                {plan.isPopular && (
                  <div className="mx-auto mb-2 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    <Zap className="h-3 w-3 mr-1" /> Mais Popular
                  </div>
                )}
                <CardTitle className="text-3xl font-bold text-gray-900">{plan.name}</CardTitle>
                <CardDescription className="text-gray-500">
                  {plan.discount && <span className="text-red-500 font-semibold mr-2">Economize {plan.discount}%</span>}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-grow space-y-6 p-6">
                <div className="text-center">
                  {plan.originalPrice && (
                    <p className="text-sm text-gray-500 line-through">
                      {formatCurrency(plan.originalPrice)}
                    </p>
                  )}
                  <p className="text-5xl font-extrabold text-primary">
                    {formatCurrency(plan.price)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{plan.billingPeriod}</p>
                </div>

                <ul className="space-y-3 text-left">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-gray-700">
                      <Check className="h-5 w-5 mr-3 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter className="p-6 pt-0">
                <Button 
                  size="lg" 
                  className="w-full transition-transform hover:scale-[1.01]"
                  variant={plan.isPopular ? 'default' : 'secondary'}
                  asChild
                >
                  <Link to={`/checkout/${plan.planSlug}`}>{plan.ctaText}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {trialPlan && (
            <div className="mt-12">
              <p className="text-lg font-semibold text-gray-700 mb-4">
                Novo por aqui? Experimente grátis!
              </p>
              <Button size="lg" variant="outline" asChild className="border-primary text-primary hover:bg-primary/10">
                <Link to="/checkout/trial">{trialPlan.ctaText} ({trialPlan.billingPeriod})</Link>
              </Button>
            </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;