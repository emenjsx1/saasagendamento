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
  monthlyPrice?: number; // Preço mensal do plano
  annualPrice?: number; // Preço anual do plano (já com desconto)
  annualBasePrice?: number; // Preço anual bruto (antes do desconto)
  isPopular: boolean;
  isTrial: boolean;
  isFree?: boolean;
  features: string[];
  planKey: 'trial' | 'free' | 'weekly' | 'monthly' | 'annual';
  planSlug: string;
  ctaText: string;
}

// Preços fixos em MTn (convertidos conforme a moeda)
// Baseado em análise de precificação: posicionamento agressivo para mercado moçambicano
// Documento original sugeria R$ 49,90 (Básico) e R$ 79,90 (Profissional)
// Ajustado para mercado local: 20% abaixo da conversão direta para melhor penetração
const FREE_PRICE = 0;
const BASIC_MONTHLY_PRICE_MTN = 180; // ~R$ 40 (ajustado de R$ 49,90)
const STANDARD_MONTHLY_PRICE_MTN = 300; // ~R$ 67 (ajustado de R$ 79,90) - Plano Profissional
const TEAMS_MONTHLY_PRICE_MTN = 500; // ~R$ 111 (ajustado de R$ 129,90) - Plano Negócio
const STANDARD_ANNUAL_DISCOUNT = 20; // 20% desconto anual (aumentado de 10%)
const TEAMS_ANNUAL_DISCOUNT = 25; // 25% desconto anual (ajustado de 40% para ser mais realista)

// Função para converter preço de MTn para outra moeda
const convertPrice = (priceMTN: number, currency: Currency): number => {
  // Se já está em MTN, retorna direto
  if (currency.key === 'MZN') {
    return priceMTN;
  }
  // Para outras moedas, usa proporção baseada no preço semanal base
  // Assumindo que weeklyBasePrice está em MTN para MZN
  // Para outras moedas, fazer conversão proporcional
  const baseRate = currency.weeklyBasePrice / 1; // 1 MTn = baseRate da moeda atual
  return parseFloat((priceMTN * baseRate).toFixed(2));
};

// Função para gerar os planos com base na configuração dinâmica e na moeda
export const generatePricingPlans = (config: PublicSubscriptionConfig, currency: Currency): PricingPlan[] => {
  const { trial_days } = config;
  
  // Calcular preços Básico
  const BASIC_MONTHLY = convertPrice(BASIC_MONTHLY_PRICE_MTN, currency);
  const BASIC_ANNUAL_BASE = BASIC_MONTHLY * 12;
  const BASIC_ANNUAL = parseFloat((BASIC_ANNUAL_BASE * (1 - STANDARD_ANNUAL_DISCOUNT / 100)).toFixed(2));
  
  // Calcular preços Standard (Profissional)
  const STANDARD_MONTHLY = convertPrice(STANDARD_MONTHLY_PRICE_MTN, currency);
  const STANDARD_ANNUAL_BASE = STANDARD_MONTHLY * 12;
  const STANDARD_ANNUAL = parseFloat((STANDARD_ANNUAL_BASE * (1 - STANDARD_ANNUAL_DISCOUNT / 100)).toFixed(2));
  
  // Calcular preços Teams (Negócio)
  const TEAMS_MONTHLY = convertPrice(TEAMS_MONTHLY_PRICE_MTN, currency);
  const TEAMS_ANNUAL_BASE = TEAMS_MONTHLY * 12;
  const TEAMS_ANNUAL = parseFloat((TEAMS_ANNUAL_BASE * (1 - TEAMS_ANNUAL_DISCOUNT / 100)).toFixed(2));
  
  // Textos em Português
  const texts = {
      trialName: 'Teste Gratuito',
      trialPeriod: `por ${trial_days} dias`,
      trialCta: 'Começar Teste Gratuito',
      freeName: 'Gratis',
      freePeriod: 'por 3 dias',
      freeCta: 'Começar',
      basicName: 'Básico',
      basicCta: 'Começar',
      standardName: 'Profissional',
      standardCta: 'Começar',
      teamsName: 'Negócio',
      teamsCta: 'Experimente grátis',
  };

  return [
    // Removido plano "trial" - não funcional (sem features)
    {
      name: texts.freeName,
      price: 0,
      billingPeriod: texts.freePeriod,
      isTrial: false,
      isFree: true,
      isPopular: false,
      features: [
        '20 agendamentos por mês',
        '1 negócio',
        '1 colaborador',
        '50 mensagens WhatsApp/SMS por mês',
        'Agendamento online',
        'Checkout M-Pesa/e-Mola',
        'App mobile',
        'Página de agendamento personalizada',
        'Gestão de serviços',
        'Relatórios básicos',
        'Suporte padrão'
      ],
      planKey: 'free',
      planSlug: 'free',
      ctaText: texts.freeCta,
    },
    {
      name: texts.basicName,
      price: BASIC_MONTHLY,
      monthlyPrice: BASIC_MONTHLY,
      annualPrice: BASIC_ANNUAL,
      annualBasePrice: BASIC_ANNUAL_BASE,
      billingPeriod: 'por mês',
      discount: STANDARD_ANNUAL_DISCOUNT,
      isPopular: false,
      isTrial: false,
      features: [
        'Até 100 agendamentos por mês',
        '1 colaborador',
        'Agendamento online',
        'Lembretes SMS/WhatsApp (50/mês)',
        'Checkout M-Pesa/e-Mola',
        'App mobile',
        'Página de agendamento personalizada',
        'Gestão de serviços',
        'Relatórios básicos',
        'Suporte padrão'
      ],
      planKey: 'monthly',
      planSlug: 'basic',
      ctaText: texts.basicCta,
    },
    {
      name: texts.standardName,
      price: STANDARD_MONTHLY,
      monthlyPrice: STANDARD_MONTHLY,
      annualPrice: STANDARD_ANNUAL,
      annualBasePrice: STANDARD_ANNUAL_BASE,
      billingPeriod: 'por mês',
      discount: STANDARD_ANNUAL_DISCOUNT,
      isPopular: true,
      isTrial: false,
      features: [
        'Agendamentos ilimitados',
        'Até 3 colaboradores',
        'Tudo do plano Básico',
        'Gestão de clientes (histórico de agendamentos)',
        'Gestão financeira completa',
        'Relatórios mensais',
        'SMS/WhatsApp ilimitado',
        'Página totalmente personalizável',
        'Suporte prioritário',
        'Máximo 1 negócio criado'
      ],
      planKey: 'monthly',
      planSlug: 'standard',
      ctaText: texts.standardCta,
    },
    {
      name: texts.teamsName,
      price: TEAMS_MONTHLY,
      monthlyPrice: TEAMS_MONTHLY,
      annualPrice: TEAMS_ANNUAL,
      annualBasePrice: TEAMS_ANNUAL_BASE,
      billingPeriod: 'por mês',
      discount: TEAMS_ANNUAL_DISCOUNT,
      isPopular: false,
      isTrial: false,
      features: [
        'Tudo do plano Profissional',
        'Até 10 colaboradores',
        'Marketplace (listagem do negócio público)',
        'Automações avançadas (lembretes inteligentes)',
        'Relatórios avançados',
        'Integrações via webhooks',
        'Suporte prioritário',
        'Múltiplos negócios (sem limite)'
      ],
      planKey: 'annual',
      planSlug: 'teams',
      ctaText: texts.teamsCta,
    },
  ];
};

export const getPlanBySlug = (slug: string, plans: PricingPlan[]): PricingPlan | undefined => {
    return plans.find(p => p.planSlug === slug);
};

export const calculateRenewalDate = (plan: PricingPlan, trialDays: number): string => {
    const today = new Date();
    
    // Verificar por planKey primeiro (mais confiável)
    if (plan.planKey === 'weekly' || plan.planSlug === 'weekly') {
        return format(addDays(today, 7), 'dd/MM/yyyy');
    }
    if (plan.planKey === 'monthly' || plan.planSlug === 'standard' || plan.planSlug === 'monthly') {
        return format(addDays(today, 30), 'dd/MM/yyyy');
    }
    if (plan.planKey === 'annual' || plan.planSlug === 'teams' || plan.planSlug === 'annual') {
        return format(addDays(today, 365), 'dd/MM/yyyy');
    }
    if (plan.isTrial || plan.planKey === 'trial' || plan.planKey === 'free' || plan.isFree) {
        const days = plan.planKey === 'free' ? 3 : trialDays;
        return format(addDays(today, days), 'dd/MM/yyyy');
    }
    
    // Fallback: verificar billingPeriod
    if (plan.billingPeriod?.includes('mês') || plan.billingPeriod?.includes('month')) {
        return format(addDays(today, 30), 'dd/MM/yyyy');
    }
    if (plan.billingPeriod?.includes('ano') || plan.billingPeriod?.includes('year')) {
        return format(addDays(today, 365), 'dd/MM/yyyy');
    }
    if (plan.billingPeriod?.includes('semana') || plan.billingPeriod?.includes('week')) {
        return format(addDays(today, 7), 'dd/MM/yyyy');
    }
    if (plan.billingPeriod?.includes('dia') || plan.billingPeriod?.includes('day')) {
        const daysMatch = plan.billingPeriod.match(/\d+/);
        const days = daysMatch ? parseInt(daysMatch[0]) : trialDays;
        return format(addDays(today, days), 'dd/MM/yyyy');
    }
    
    return 'N/A';
};