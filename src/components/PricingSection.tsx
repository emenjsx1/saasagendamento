import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Check, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, formatCurrency } from '@/lib/utils';
import { generatePricingPlans } from '@/utils/pricing-plans';
import { usePublicSettings } from '@/hooks/use-public-settings';
import { useCurrency } from '@/contexts/CurrencyContext';

const PricingSection: React.FC = () => {
  const { subscriptionConfig, isLoading } = usePublicSettings();
  const { currentCurrency, T } = useCurrency();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  
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
  
  // Mostrar planos: Free, Standard, Teams
  const freePlan = pricingPlans.find(p => p.planKey === 'free');
  const standardPlan = pricingPlans.find(p => p.planSlug === 'standard');
  const teamsPlan = pricingPlans.find(p => p.planSlug === 'teams');
  const allDisplayPlans = [freePlan, standardPlan, teamsPlan].filter(Boolean);
  
  const translateFeature = (ptText: string) => {
      const translations: Record<string, string> = {
        '30 agendamentos por mês': '30 appointments per month',
        'Página de agendamento personalizável': 'Customizable booking page',
        'Gestão de serviços básica': 'Basic service management',
        'Relatórios básicos': 'Basic reports',
        'Notificações no WhatsApp': 'WhatsApp notifications',
        'Suporte padrão': 'Standard support',
        '1 negócio apenas': '1 business only',
        'Sem gestão financeira': 'No financial management',
        'Agendamentos ilimitados': 'Unlimited appointments',
        'Página de agendamento totalmente personalizável': 'Fully customizable booking page',
        'Gestão de serviços completa': 'Complete service management',
        'Gestão financeira completa': 'Complete financial management',
        'Suporte prioritário': 'Priority support',
        'Máximo 1 negócio criado': 'Maximum 1 business created',
        'Tudo do plano Standard': 'Everything from Standard plan',
        'Múltiplos negócios (sem limite)': 'Multiple businesses (unlimited)',
        'Relatórios avançados': 'Advanced reports',
        'Integração com WhatsApp (futuro)': 'WhatsApp integration (future)',
        'Consultoria de setup': 'Setup consulting',
        'Melhor custo-benefício': 'Best value',
      };
      
      return T(ptText, translations[ptText] || ptText);
  };

  const renderPlanCard = (plan: any, index: number) => {
    if (!plan) return null;
    
    const isRecommended = plan.planSlug === 'standard';
    const isFree = plan.isFree;
    
    // Determinar preço baseado no ciclo de cobrança
    let displayPrice = plan.price;
    let displayPeriod = plan.billingPeriod;
    let showOriginalPrice = false;
    let originalPrice = 0;
    
    if (!isFree && plan.monthlyPrice && plan.annualPrice) {
      if (billingCycle === 'monthly') {
        displayPrice = plan.monthlyPrice;
        displayPeriod = T('por mês', 'per month');
      } else {
        displayPrice = plan.annualPrice;
        displayPeriod = T('por ano', 'per year');
        if (plan.annualBasePrice) {
          originalPrice = plan.annualBasePrice;
          showOriginalPrice = true;
        }
      }
    }
    
    // Extrair valor numérico do preço
    const priceText = formatCurrency(displayPrice, currentCurrency.key, currentCurrency.locale);
    const priceMatch = priceText.match(/[\d,]+\.?\d*/);
    const priceValue = priceMatch ? priceMatch[0] : '';
    const currencySymbol = priceText.replace(priceValue, '').trim();
    
    return (
      <Card 
        key={plan.name} 
        className={cn(
          "relative flex flex-col transition-all duration-300 hover:shadow-xl rounded-xl overflow-hidden bg-white h-full",
          isRecommended 
            ? "border-2 border-black shadow-lg" 
            : "border border-gray-200 shadow-sm"
        )}
      >
        {/* Badge "Plano recomendado" */}
        {isRecommended && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center gap-1 rounded-full bg-black text-white px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold z-10">
            {T('Plano recomendado', 'Recommended plan')}
          </div>
        )}
        
        <CardHeader className="text-left pb-3 pt-5 sm:pt-6 px-5 sm:px-6 md:px-8">
          <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-black mb-1 sm:mb-2">
            {plan.name === 'Free' ? T('Free', 'Free') : 
             plan.name === 'Standard' ? T('Standard', 'Standard') : 
             plan.name === 'Teams' ? T('Teams', 'Teams') : plan.name}
          </CardTitle>
          {plan.planKey === 'free' && (
            <CardDescription className="text-xs sm:text-sm text-gray-600">
              {T('Para uso pessoal', 'For personal use')}
            </CardDescription>
          )}
          {plan.planSlug === 'standard' && (
            <CardDescription className="text-xs sm:text-sm text-gray-600">
              {T('Para profissionais e pequenas equipes', 'For professionals and small teams')}
            </CardDescription>
          )}
          {plan.planSlug === 'teams' && (
            <CardDescription className="text-xs sm:text-sm text-gray-600">
              {T('Para empresas em crescimento', 'For growing businesses')}
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent className="flex-grow space-y-4 sm:space-y-6 px-5 sm:px-6 md:px-8 pb-4 sm:pb-6">
          {/* Preço */}
          <div className="text-left">
            {showOriginalPrice && originalPrice > 0 && (
              <p className="text-sm sm:text-base text-gray-400 line-through mb-1">
                {formatCurrency(originalPrice, currentCurrency.key, currentCurrency.locale)}
              </p>
            )}
            <div className="flex items-baseline gap-1 sm:gap-2 mb-2">
              {isFree ? (
                <>
                  <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-black">
                    {T('Grátis', 'Free')}
                  </span>
                  <span className="text-sm sm:text-base text-gray-600">
                    {plan.billingPeriod}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-black">
                    {currencySymbol}{priceValue.split(',')[0]}
                  </span>
                  <span className="text-sm sm:text-base text-gray-600">
                    {displayPeriod}
                  </span>
                </>
              )}
            </div>
            {!isFree && plan.discount && billingCycle === 'annual' && (
              <p className="text-xs sm:text-sm text-black font-semibold">
                {T(`Economize ${plan.discount}%`, `Save ${plan.discount}%`)}
              </p>
            )}
          </div>

          {/* Lista de features */}
          <ul className="space-y-2.5 sm:space-y-3 text-left">
            {plan.features.map((feature: string, idx: number) => (
              <li key={idx} className="flex items-start text-gray-700">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-black mr-2.5 sm:mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm leading-relaxed">{translateFeature(feature)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        
        <CardFooter className="px-5 sm:px-6 md:px-8 pb-5 sm:pb-6 md:pb-8 pt-0">
          <Button 
            size="lg" 
            className={cn(
              "w-full transition-all duration-300 h-10 sm:h-11 md:h-12 text-sm sm:text-base font-semibold rounded-lg",
              'bg-black hover:bg-black/90 text-white'
            )}
            asChild
          >
            <Link to={`/checkout/${plan.planSlug}`}>
              {plan.planKey === 'free' 
                ? T('Começar', 'Get Started')
                : plan.planSlug === 'teams'
                ? T('Experimente grátis', 'Try for free')
                : T('Começar', 'Get Started')
              }
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <section id="pricing" className="relative py-12 sm:py-16 md:py-24 lg:py-32 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
        {/* Título principal */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6 sm:mb-8 md:mb-12 text-black px-2">
          {T('Escolha o plano perfeito para sua equipe', 'Choose the perfect plan for your team')}
        </h2>

        {/* Toggle de billing cycle */}
        <div className="flex items-center justify-center gap-4 mb-8 sm:mb-12 md:mb-16">
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={cn(
              "relative px-4 py-2 text-sm sm:text-base font-medium transition-colors",
              billingCycle === 'annual' 
                ? "text-black" 
                : "text-gray-600 hover:text-black"
            )}
          >
            {T('Cobrança anual', 'Annual billing')}
            {billingCycle === 'annual' && (
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-black"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              "relative px-4 py-2 text-sm sm:text-base font-medium transition-colors",
              billingCycle === 'monthly' 
                ? "text-black" 
                : "text-gray-600 hover:text-black"
            )}
          >
            {T('Cobrança mensal', 'Monthly billing')}
            {billingCycle === 'monthly' && (
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-black"></span>
            )}
          </button>
        </div>

        {/* Desktop: Grid */}
        <div className="hidden md:grid grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto mb-8 sm:mb-12">
          {allDisplayPlans.map((plan, index) => renderPlanCard(plan, index))}
        </div>

        {/* Mobile: Carousel */}
        <div className="md:hidden mb-8 sm:mb-12">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full max-w-sm mx-auto"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {allDisplayPlans.map((plan, index) => (
                <CarouselItem key={plan?.planKey || index} className="pl-2 md:pl-4 basis-full">
                  {renderPlanCard(plan, index)}
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          
          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {allDisplayPlans.map((_, index) => (
              <div
                key={index}
                className="h-2 w-2 rounded-full bg-gray-300 transition-colors"
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
        
        {/* Link para página de preços */}
        <div className="mt-8 sm:mt-12">
          <Link 
            to="/pricing" 
            className="text-sm sm:text-base text-gray-600 hover:text-black transition-colors font-medium inline-flex items-center gap-1"
          >
            {T('Saiba mais na nossa página de preços', 'Learn more on our pricing page')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;