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
    <section id="pricing" className="relative py-12 sm:py-16 md:py-24 lg:py-32 bg-white overflow-hidden">
      {/* Grid pattern sutil */}
      <div className="absolute inset-0 grid-pattern opacity-20"></div>
      
      <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 sm:mb-4 text-black px-2">
            {T('Plano único com tudo o que você precisa!', 'Single plan with everything you need!')}
          </h2>
        </div>
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mb-8 sm:mb-12 md:mb-16 max-w-2xl mx-auto px-2">
          {T('Escolha a frequência de pagamento que melhor se adapta ao seu fluxo de caixa.', 'Choose the payment frequency that best suits your cash flow.')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-7xl mx-auto">
          {displayPlans.map((plan) => (
            <Card 
              key={plan.name} 
              className={cn(
                "relative flex flex-col transition-all duration-500 hover:shadow-2xl hover:translate-y-[-8px] rounded-2xl overflow-hidden group",
                plan.isPopular 
                  ? "border-2 border-black shadow-2xl bg-white" 
                  : "border border-black/10 shadow-lg bg-white"
              )}
            >
              {/* Borda destacada para planos populares */}
              {plan.isPopular && (
                <div className="absolute inset-0 rounded-2xl border-2 border-black animate-border-glow"></div>
              )}
              
              <CardHeader className="text-center pb-3 sm:pb-4 relative z-10 px-4 sm:px-5 md:px-6">
                {plan.isPopular && (
                  <div className="mx-auto mb-2 sm:mb-3 md:mb-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-black text-white px-2.5 sm:px-3 md:px-5 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs md:text-sm font-bold shadow-lg">
                    <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4" /> {T('Mais Popular', 'Most Popular')}
                  </div>
                )}
                <CardTitle className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-black transition-all duration-300">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-gray-600 text-[10px] sm:text-xs md:text-sm">
                  {plan.discount && (
                    <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-full bg-black/5 text-black font-semibold text-[10px] sm:text-xs md:text-sm border border-black/20">
                      {T(`Economize ${plan.discount}%`, `Save ${plan.discount}%`)}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-grow space-y-3 sm:space-y-4 md:space-y-6 p-4 sm:p-5 md:p-6 relative z-10">
                <div className="text-center">
                  {plan.originalPrice && (
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 line-through mb-1 sm:mb-1.5 md:mb-2">
                      {formatCurrency(plan.originalPrice, currentCurrency.key, currentCurrency.locale)}
                    </p>
                  )}
                  <p className={cn(
                    "text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-1 sm:mb-1.5 md:mb-2 break-words",
                    plan.isPopular 
                      ? "text-black" 
                      : "text-black"
                  )}>
                    {formatCurrency(plan.price, currentCurrency.key, currentCurrency.locale)}
                  </p>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 font-medium">{plan.billingPeriod}</p>
                </div>

                <ul className="space-y-2 sm:space-y-2.5 md:space-y-3 text-left">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-gray-700 group/item">
                      <div className="relative mr-2 sm:mr-2.5 md:mr-3 flex-shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-black relative z-10" />
                      </div>
                      <span className="text-[11px] sm:text-xs md:text-sm leading-relaxed">{translateFeature(feature)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter className="p-4 sm:p-5 md:p-6 pt-0 relative z-10">
                <Button 
                  size="lg" 
                  className={cn(
                    "w-full transition-all duration-300 h-9 sm:h-10 md:h-12 text-xs sm:text-sm md:text-base lg:text-lg rounded-xl transform hover:scale-105 relative overflow-hidden group/btn",
                    plan.isPopular 
                      ? 'bg-black hover:bg-black/90 text-white shadow-xl hover:shadow-2xl' 
                      : 'bg-black hover:bg-black/90 text-white shadow-lg hover:shadow-xl'
                  )}
                  asChild
                >
                  <Link to={`/checkout/${plan.planSlug}`}>
                    <span className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2">
                      <span className="text-[11px] sm:text-xs md:text-sm lg:text-base">{plan.ctaText}</span>
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 transform group-hover/btn:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 animate-shimmer"></div>
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {trialPlan && (
            <div className="mt-12 md:mt-20 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full max-w-md h-px bg-black/10"></div>
              </div>
              <div className="relative bg-white rounded-2xl p-6 md:p-8 border border-black/10 shadow-xl text-center">
                <p className="text-lg md:text-xl font-bold text-black mb-4 md:mb-6">
                  {T('Novo por aqui? Experimente grátis!', 'New here? Try it for free!')}
                </p>
                <Button 
                  size="lg" 
                  variant="outline" 
                  asChild 
                  className="group relative overflow-hidden border-2 border-black text-black hover:text-white hover:bg-black transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl px-6 md:px-8 py-4 md:py-6 text-sm md:text-lg font-semibold"
                >
                  <Link to="/checkout/trial">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <span className="text-xs md:text-base">{trialPlan.ctaText}</span>
                      <span className="hidden md:inline">({trialPlan.billingPeriod})</span>
                      <ArrowRight className="h-4 w-4 md:h-5 md:w-5 transform group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                </Button>
              </div>
            </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;