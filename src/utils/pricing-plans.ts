import { format } from 'date-fns';
import { addDays } from 'date-fns';

export interface PricingPlan {
  name: string;
  price: number;
  billingPeriod: string;
  originalPrice?: number;
  discount?: number;
  isPopular: boolean;
  isTrial: boolean;
  features: string[];
  planKey: string;
  planSlug: string;
  ctaText: string;
}

const WEEKLY_PRICE = 147;

export const pricingPlans: PricingPlan[] = [
  {
    name: 'Teste Gratuito',
    price: 0,
    billingPeriod: 'por 3 dias',
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
    price: 529.20,
    billingPeriod: 'por mês',
    originalPrice: 588, // 147 * 4
    discount: 10,
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
    price: 4586.40,
    billingPeriod: 'por ano',
    originalPrice: 7644, // 147 * 52
    discount: 40,
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

export const getPlanBySlug = (slug: string): PricingPlan | undefined => {
    return pricingPlans.find(p => p.planSlug === slug);
};

export const calculateRenewalDate = (plan: PricingPlan): string => {
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
        return format(addDays(today, 3), 'dd/MM/yyyy');
    }
    return 'N/A';
};