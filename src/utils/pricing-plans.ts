import { format } from 'date-fns';
import { addDays } from 'date-fns';
import { PublicSubscriptionConfig } from '@/hooks/use-public-settings';
import { Currency } from './currency'; // Import Currency type

export interface PricingPlan {
  name: string;
  price: number;
  billingPeriod: string;
  originalPrice?: number;
  discount?: number;
  isPopular: boolean;
  isTrial: boolean;
  features: string[];
  planKey: 'trial' | 'weekly' | 'monthly' | 'annual';
  planSlug: string;
  ctaText: string;
}

// Função para gerar os planos com base na configuração dinâmica e na moeda
export const generatePricingPlans = (config: PublicSubscriptionConfig, currency: Currency): PricingPlan[] => {
  const { trial_days } = config;
  
  const WEEKLY_PRICE = currency.weeklyBasePrice;
  const MONTHLY_PRICE_BASE = WEEKLY_PRICE * 4; // Base mensal (4 semanas)
  const ANNUAL_PRICE_BASE = WEEKLY_PRICE * 52; // Base anual (52 semanas)

  // Descontos fixos (mantidos por enquanto)
  const MONTHLY_DISCOUNT_PERCENT = 10;
  const ANNUAL_DISCOUNT_PERCENT = 40;
  
  const calculateDiscountedPrice = (base: number, discount: number) => {
      return parseFloat((base * (1 - discount / 100)).toFixed(2));
  };

  // Textos em Português (serão traduzidos via contexto/componente se language === 'en')
  const texts = {
      trialName: 'Teste Gratuito',
      trialPeriod: `por ${trial_days} dias`,
      trialCta: 'Começar Teste Gratuito',
      weeklyName: 'Plano Semanal',
      weeklyPeriod: 'por semana',
      weeklyCta: 'Escolher Semanal',
      monthlyName: 'Plano Mensal',
      monthlyPeriod: 'por mês',
      monthlyCta: 'Escolher Mensal',
      annualName: 'Plano Anual',
      annualPeriod: 'por ano',
      annualCta: 'Escolher Anual',
      monthlyDiscount: 'Desconto de 10%',
      annualDiscount: 'Desconto de 40% (Melhor Valor)',
      // Features (simplificadas para não precisar de i18n complexo aqui)
      features: [
        'Agendamentos Ilimitados',
        'Página de Agendamento Personalizada',
        'Gestão de Serviços',
        'Gestão Financeira Completa',
        'Relatórios Básicos',
        'Notificações por E-mail',
        'Suporte Padrão',
        'Sem expiração',
        'Suporte Prioritário',
        'Relatórios Avançados',
        'Integração WhatsApp (Futuro)',
        'Consultoria de Setup',
      ]
  };

  return [
    {
      name: texts.trialName,
      price: 0,
      billingPeriod: texts.trialPeriod,
      isTrial: true,
      isPopular: false,
      features: [texts.features[0], texts.features[1], texts.features[2], texts.features[3], texts.features[4], texts.features[5]],
      planKey: 'trial',
      planSlug: 'trial',
      ctaText: texts.trialCta,
    },
    {
      name: texts.weeklyName,
      price: WEEKLY_PRICE,
      billingPeriod: texts.weeklyPeriod,
      isTrial: false,
      isPopular: false,
      features: [texts.features[0], texts.features[1], texts.features[2], texts.features[3], texts.features[4], texts.features[5], texts.features[6], texts.features[7]],
      planKey: 'weekly',
      planSlug: 'weekly',
      ctaText: texts.weeklyCta,
    },
    {
      name: texts.monthlyName,
      price: calculateDiscountedPrice(MONTHLY_PRICE_BASE, MONTHLY_DISCOUNT_PERCENT),
      billingPeriod: texts.monthlyPeriod,
      originalPrice: MONTHLY_PRICE_BASE,
      discount: MONTHLY_DISCOUNT_PERCENT,
      isPopular: true,
      isTrial: false,
      features: [
        texts.features[0], texts.features[1], texts.features[2], texts.features[3], texts.features[4], texts.features[5],
        texts.monthlyDiscount, 
        texts.features[8]
      ],
      planKey: 'monthly',
      planSlug: 'monthly',
      ctaText: texts.monthlyCta,
    },
    {
      name: texts.annualName,
      price: calculateDiscountedPrice(ANNUAL_PRICE_BASE, ANNUAL_DISCOUNT_PERCENT),
      billingPeriod: texts.annualPeriod,
      originalPrice: ANNUAL_PRICE_BASE,
      discount: ANNUAL_DISCOUNT_PERCENT,
      isPopular: false,
      isTrial: false,
      features: [
        texts.features[0], texts.features[1], texts.features[2], texts.features[3], texts.features[4], texts.features[5],
        texts.annualDiscount, 
        texts.features[9], 
        texts.features[10], 
        texts.features[11]
      ],
      planKey: 'annual',
      planSlug: 'annual',
      ctaText: texts.annualCta,
    },
  ];
};

export const getPlanBySlug = (slug: string, plans: PricingPlan[]): PricingPlan | undefined => {
    return plans.find(p => p.planSlug === slug);
};

export const calculateRenewalDate = (plan: PricingPlan, trialDays: number): string => {
    const today = new Date();
    if (plan.planSlug === 'weekly') {
        return format(addDays(today, 7), 'dd/MM/yyyy');
    }
    if (plan.planSlug === 'monthly') {
        return format(addDays(today, 30), 'dd/MM/yyyy');
    }
    if (plan.planSlug === 'annual') {
        return format(addDays(today, 365), 'dd/MM/yyyy');
    }
    if (plan.isTrial) {
        return format(addDays(today, trialDays), 'dd/MM/yyyy');
    }
    return 'N/A';
};