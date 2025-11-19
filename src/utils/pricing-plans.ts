import { format } from 'date-fns';
import { addDays } from 'date-fns';
import { PublicSubscriptionConfig } from '@/hooks/use-public-settings';

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

// Função para gerar os planos com base na configuração dinâmica
export const generatePricingPlans = (config: PublicSubscriptionConfig): PricingPlan[] => {
  const { trial_days, base_prices } = config;
  
  const WEEKLY_PRICE = base_prices.weekly;
  const MONTHLY_PRICE_BASE = WEEKLY_PRICE * 4; // Base mensal (4 semanas)
  const ANNUAL_PRICE_BASE = WEEKLY_PRICE * 52; // Base anual (52 semanas)

  // Descontos fixos (mantidos por enquanto, mas podem ser dinâmicos no futuro)
  const MONTHLY_DISCOUNT_PERCENT = 10;
  const ANNUAL_DISCOUNT_PERCENT = 40;
  
  const calculateDiscountedPrice = (base: number, discount: number) => {
      return parseFloat((base * (1 - discount / 100)).toFixed(2));
  };

  return [
    {
      name: 'Teste Gratuito',
      price: 0,
      billingPeriod: `por ${trial_days} dias`,
      isTrial: true,
      isPopular: false,
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
      ctaText: 'Começar Teste Gratuito',
    },
    {
      name: 'Plano Semanal',
      price: WEEKLY_PRICE,
      billingPeriod: 'por semana',
      isTrial: false,
      isPopular: false,
      features: [
        'Tudo do Teste Gratuito',
        'Suporte Padrão',
        'Sem expiração',
      ],
      planKey: 'weekly',
      planSlug: 'weekly',
      ctaText: 'Escolher Semanal',
    },
    {
      name: 'Plano Mensal',
      price: calculateDiscountedPrice(MONTHLY_PRICE_BASE, MONTHLY_DISCOUNT_PERCENT),
      billingPeriod: 'por mês',
      originalPrice: MONTHLY_PRICE_BASE,
      discount: MONTHLY_DISCOUNT_PERCENT,
      isPopular: true,
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
      ctaText: 'Escolher Mensal',
    },
    {
      name: 'Plano Anual',
      price: calculateDiscountedPrice(ANNUAL_PRICE_BASE, ANNUAL_DISCOUNT_PERCENT),
      billingPeriod: 'por ano',
      originalPrice: ANNUAL_PRICE_BASE,
      discount: ANNUAL_DISCOUNT_PERCENT,
      isPopular: false,
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
      ctaText: 'Escolher Anual',
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