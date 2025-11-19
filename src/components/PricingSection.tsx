import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Zap, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, formatCurrency } from '@/lib/utils';
import { generatePricingPlans } from '@/utils/pricing-plans';
import { usePublicSettings } from '@/hooks/use-public-settings';
import { useCurrency } from '@/contexts/CurrencyContext';

const PricingSection: React.FC = () => {
  const { subscriptionConfig, isLoading } = usePublicSettings();
  const { currentCurrency, T } = useCurrency();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!subscriptionConfig) {
      return null; 
  }

  const pricingPlans = generatePricingPlans(subscriptionConfig, currentCurrency);
  
  const displayPlans = pricingPlans.filter(p => !p.isTrial);
  const trialPlan = pricingPlans.find(p => p.isTrial);
  
  const translateFeature = (ptText: string) => {
      if (!T('', '')) return ptText;
      
      const translations: Record<string, string> = {
        'Agendamentos Ilimitados': 'Unlimited Appointments',
        'Página de Agendamento Personalizada': 'Custom Booking Page',
        'Gestão de Serviços': 'Service Management',
        'Gestão Financeira Completa': 'Full Financial Management',
        'Relatórios Básicos': 'Basic Reports',
        'Notificações por E-mail': 'Email Notifications',
        'Suporte Padrão': 'Standard Support',
        'Sem expiração': 'No expiration',
        'Suporte Prioritário': 'Priority Support',
        'Relatórios Avançados': 'Advanced Reports',
        'Integração WhatsApp (Futuro)': 'WhatsApp Integration (Future)',
        'Consultoria de Setup': 'Setup Consulting',
        'Desconto de 10%': '10% Discount',
        'Desconto de 40% (Melhor Valor)': '40% Discount (Best Value)',
      };
      
      return T(ptText, translations[ptText] || ptText);
  };


  return (
    <section id="pricing" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4">{T('Plano único com tudo o que você precisa!', 'Single plan with everything you need!')}</h2>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          {T('Escolha a frequência de pagamento que melhor se adapta ao seu fluxo de caixa.', 'Choose the payment frequency that best suits your cash flow.')}
        </p>

        {/* Ajuste: Usando max-w-7xl e removendo a escala excessiva no hover */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {displayPlans.map((plan) => (
            <Card 
              key={plan.name} 
              className={cn(
                "flex flex-col transition-all duration-300 hover:shadow-2xl hover:translate-y-[-4px] rounded-3xl", // Efeito de elevação sutil
                plan.isPopular ? "border-4 border-primary shadow-2xl bg-white" : "border border-gray-200 shadow-lg bg-white"
              )}
            >
              <CardHeader className="text-center pb-4">
                {plan.isPopular && (
                  <div className="mx-auto mb-2 inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-md">
                    <Zap className="h-4 w-4 mr-1" /> {T('Mais Popular', 'Most Popular')}
                  </div>
                )}
                <CardTitle className="text-3xl font-bold text-gray-900">{plan.name}</CardTitle>
                <CardDescription className="text-gray-500">
                  {plan.discount && <span className="text-red-500 font-semibold mr-2">{T(`Economize ${plan.discount}%`, `Save ${plan.discount}%`)}</span>}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-grow space-y-6 p-6">
                <div className="text-center">
                  {plan.originalPrice && (
                    <p className="text-sm text-gray-500 line-through">
                      {formatCurrency(plan.originalPrice, currentCurrency.key, currentCurrency.locale)}
                    </p>
                  )}
                  <p className="text-6xl font-extrabold text-primary">
                    {formatCurrency(plan.price, currentCurrency.key, currentCurrency.locale)}
                  </p>
                  <p className="text-md text-gray-600 mt-1">{plan.billingPeriod}</p>
                </div>

                <ul className="space-y-3 text-left">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-gray-700">
                      <Check className="h-5 w-5 mr-3 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{translateFeature(feature)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter className="p-6 pt-0">
                <Button 
                  size="lg" 
                  className={cn(
                    "w-full transition-all duration-300 h-12 text-lg rounded-xl transform hover:scale-[1.01]",
                    plan.isPopular ? 'bg-primary hover:bg-primary/90 shadow-lg' : 'bg-gray-800 hover:bg-gray-700 text-white'
                  )}
                  asChild
                >
                  <Link to={`/checkout/${plan.planSlug}`}>
                    {plan.ctaText} <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {trialPlan && (
            <div className="mt-16">
              <p className="text-lg font-semibold text-gray-700 mb-4">
                {T('Novo por aqui? Experimente grátis!', 'New here? Try it for free!')}
              </p>
              <Button size="lg" variant="outline" asChild className="border-2 border-primary text-primary hover:bg-primary/10 transition-all duration-300 transform hover:scale-[1.05] shadow-md">
                <Link to="/checkout/trial">{trialPlan.ctaText} ({trialPlan.billingPeriod})</Link>
              </Button>
            </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;