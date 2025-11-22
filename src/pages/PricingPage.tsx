import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, formatCurrency } from '@/lib/utils';
import { generatePricingPlans } from '@/utils/pricing-plans';
import { usePublicSettings } from '@/hooks/use-public-settings';
import { useCurrency } from '@/contexts/CurrencyContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PricingPage: React.FC = () => {
  const { subscriptionConfig, isLoading } = usePublicSettings();
  const { currentCurrency, T } = useCurrency();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
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

  const renderPlanCard = (plan: any) => {
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
        
        <CardHeader className="text-left pb-3 pt-6 sm:pt-8 px-6 sm:px-8">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-2">
            {plan.name === 'Free' ? T('Free', 'Free') : 
             plan.name === 'Standard' ? T('Standard', 'Standard') : 
             plan.name === 'Teams' ? T('Teams', 'Teams') : plan.name}
          </CardTitle>
          {plan.planKey === 'free' && (
            <CardDescription className="text-sm text-gray-600">
              {T('Para uso pessoal', 'For personal use')}
            </CardDescription>
          )}
          {plan.planSlug === 'standard' && (
            <CardDescription className="text-sm text-gray-600">
              {T('Para profissionais e pequenas equipes', 'For professionals and small teams')}
            </CardDescription>
          )}
          {plan.planSlug === 'teams' && (
            <CardDescription className="text-sm text-gray-600">
              {T('Para empresas em crescimento', 'For growing businesses')}
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent className="flex-grow space-y-6 px-6 sm:px-8 pb-6">
          {/* Preço */}
          <div className="text-left">
            {showOriginalPrice && originalPrice > 0 && (
              <p className="text-base sm:text-lg text-gray-400 line-through mb-1">
                {formatCurrency(originalPrice, currentCurrency.key, currentCurrency.locale)}
              </p>
            )}
            {isFree ? (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl sm:text-5xl md:text-6xl font-bold text-black">
                    {T('Grátis', 'Free')}
                  </span>
                  <span className="text-base sm:text-lg text-gray-600">
                    {plan.billingPeriod}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl sm:text-5xl md:text-6xl font-bold text-black">
                    {currencySymbol}{priceValue.split(',')[0]}
                  </span>
                  <span className="text-base sm:text-lg text-gray-600">
                    {displayPeriod}
                  </span>
                </div>
                {plan.discount && billingCycle === 'annual' && (
                  <p className="text-sm text-black font-semibold">
                    {T(`Economize ${plan.discount}%`, `Save ${plan.discount}%`)}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Lista de features */}
          <div>
            <ul className="space-y-3 text-left">
              {plan.features.map((feature: string, index: number) => (
                <li key={index} className="flex items-start text-gray-700">
                  <Check className="h-5 w-5 text-black mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{translateFeature(feature)}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
        
        <CardFooter className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0">
          <Button 
            size="lg" 
            className={cn(
              "w-full transition-all duration-300 h-12 text-base font-semibold rounded-lg",
              'bg-black hover:bg-black/90 text-white'
            )}
            asChild
          >
            <Link to={`/checkout/${plan.planSlug}${!isFree && billingCycle === 'annual' ? '-annual' : ''}`}>
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
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-grow pt-16 sm:pt-20">
        {/* Hero Section */}
        <section className="py-8 sm:py-12 md:py-16 bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-black">
              {T('Escolha o plano perfeito para sua equipe', 'Choose the perfect plan for your team')}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              {T('Preços', 'Pricing')}
            </p>
          </div>
        </section>

        {/* Toggle de billing cycle */}
        <section className="py-6 sm:py-8 md:py-12 bg-gray-50 border-b border-gray-200">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-center gap-4 mb-8">
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
          </div>
        </section>

        {/* Cards de planos */}
        <section className="py-12 sm:py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
              {allDisplayPlans.map((plan) => renderPlanCard(plan))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 sm:py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-12 text-black text-center">
              {T('Perguntas frequentes', 'Frequently asked questions')}
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-black mb-2">
                  {T('O que acontece ao final da minha avaliação?', 'What happens at the end of my trial?')}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {T('Ao final da sua avaliação de 3 dias, ocorrerá automaticamente o downgrade para o nível Gratuito com limitações (30 agendamentos/mês, sem gestão financeira) e você poderá continuar usando o AgenCode. Se você decidir atualizar para um plano pago, poderá fazer isso na página de faturamento em sua conta a qualquer momento durante ou após o período de avaliação.', 'At the end of your 3-day trial, you will automatically be downgraded to the Free level with limitations (30 appointments/month, no financial management) and you can continue using AgenCode. If you decide to upgrade to a paid plan, you can do so on the billing page in your account at any time during or after the trial period.')}
                </p>
              </div>
              
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-black mb-2">
                  {T('Como é o processo de renovação?', 'How does the renewal process work?')}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {T('As assinaturas pagas são renovadas automaticamente para o mesmo período de assinatura, a menos que você faça o downgrade do seu plano antes da sua data de renovação.', 'Paid subscriptions are automatically renewed for the same subscription period, unless you downgrade your plan before your renewal date.')}
                </p>
              </div>
              
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-black mb-2">
                  {T('Como faço para fazer upgrade ou downgrade?', 'How do I upgrade or downgrade?')}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {T('Visite sua página de faturamento indo para Minha conta > Faturamento. A partir daí, você pode alterar seu plano, adicionar ou remover assentos de usuário e atualizar suas informações de pagamento.', 'Visit your billing page by going to My account > Billing. From there, you can change your plan, add or remove user seats, and update your payment information.')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 sm:py-16 md:py-24 bg-gray-50 border-t border-gray-200">
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-black">
              {T('Pronto para o futuro da gestão?', 'Ready for the future of management?')}
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              {T('Junte-se a milhares de empresas que já transformaram sua gestão.', 'Join thousands of companies that have already transformed their management.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                asChild 
                className="bg-black hover:bg-black/90 text-white px-8 py-6 text-base font-semibold rounded-lg"
              >
                <Link to="/checkout/free">
                  {T('Começar gratuitamente', 'Start for free')}
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                asChild 
                className="border-2 border-black text-black hover:bg-black hover:text-white px-8 py-6 text-base font-semibold rounded-lg"
              >
                <Link to="/contact">
                  {T('Obter uma demonstração', 'Get a demo')}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default PricingPage;