import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, Loader2, ArrowRight } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { generatePricingPlans } from '@/utils/pricing-plans';
import { usePublicSettings } from '@/hooks/use-public-settings';
import { useSubscription } from '@/hooks/use-subscription';
import { Badge } from '@/components/ui/badge';

const SubscriptionManagementSection: React.FC = () => {
  const { subscription, isLoading: isSubLoading } = useSubscription();
  const { subscriptionConfig, isLoading: isConfigLoading } = usePublicSettings();
  
  if (isConfigLoading || isSubLoading) {
    return (
      <div className="flex justify-center items-center h-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!subscriptionConfig) return null;

  const pricingPlans = generatePricingPlans(subscriptionConfig);
  const displayPlans = pricingPlans.filter(p => !p.isTrial);
  const currentPlanSlug = subscription?.plan_name.toLowerCase().replace(/\s/g, '-') || 'none';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Mudar ou Renovar Plano</h2>
      <p className="text-gray-600">Escolha o plano que melhor se adapta às suas necessidades. Seu plano atual está destacado.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayPlans.map((plan) => {
          const isCurrent = plan.planSlug === currentPlanSlug;
          
          return (
            <Card 
              key={plan.name} 
              className={cn(
                "flex flex-col transition-all duration-300",
                isCurrent ? "border-2 border-primary shadow-2xl scale-[1.02]" : "border border-gray-200 shadow-lg"
              )}
            >
              <CardHeader className="text-center pb-4">
                {isCurrent && (
                  <Badge className="mx-auto mb-2 bg-primary text-primary-foreground">Plano Atual</Badge>
                )}
                <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
                <CardDescription className="text-gray-500">
                  {plan.discount && <span className="text-red-500 font-semibold mr-2">Economize {plan.discount}%</span>}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-grow space-y-4 p-6 pt-0">
                <div className="text-center">
                  {plan.originalPrice && (
                    <p className="text-sm text-gray-500 line-through">
                      {formatCurrency(plan.originalPrice)}
                    </p>
                  )}
                  <p className="text-4xl font-extrabold text-primary">
                    {formatCurrency(plan.price)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{plan.billingPeriod}</p>
                </div>

                <ul className="space-y-2 text-left text-sm">
                  {plan.features.slice(0, 4).map((feature, index) => (
                    <li key={index} className="flex items-start text-gray-700">
                      <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter className="p-6 pt-0">
                <Button 
                  size="lg" 
                  className="w-full"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent}
                  asChild
                >
                  {isCurrent ? (
                    <span>Plano Selecionado</span>
                  ) : (
                    <Link to={`/checkout/${plan.planSlug}`}>
                        {plan.ctaText} <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionManagementSection;