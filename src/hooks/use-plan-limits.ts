import { useState, useEffect } from 'react';
import { useSession } from '@/integrations/supabase/session-context';
import { useSubscription } from '@/hooks/use-subscription';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, isBefore, isAfter, parseISO } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';

export interface PlanLimits {
  planName: 'free' | 'standard' | 'teams' | null;
  maxAppointments: number | null; // null = ilimitado
  maxBusinesses: number | null; // null = ilimitado
  hasFinancialManagement: boolean;
  hasAdvancedReports: boolean;
  planExpired: boolean;
  appointmentsUsed: number;
  businessesCount: number;
  appointmentsRemaining: number | null;
  canCreateAppointment: boolean;
  canCreateBusiness: boolean;
  canAccessFinance: boolean;
  canAccessAdvancedReports: boolean;
}

export interface UsePlanLimitsResult {
  limits: PlanLimits;
  isLoading: boolean;
  refresh: () => void;
}

export const usePlanLimits = (): UsePlanLimitsResult => {
  const { user } = useSession();
  const { subscription, isLoading: isSubscriptionLoading, refresh: refreshSubscription } = useSubscription();
  const { T } = useCurrency();
  const [limits, setLimits] = useState<PlanLimits>({
    planName: null,
    maxAppointments: null,
    maxBusinesses: null,
    hasFinancialManagement: false,
    hasAdvancedReports: false,
    planExpired: false,
    appointmentsUsed: 0,
    businessesCount: 0,
    appointmentsRemaining: null,
    canCreateAppointment: false,
    canCreateBusiness: false,
    canAccessFinance: false,
    canAccessAdvancedReports: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
    refreshSubscription();
  };

  useEffect(() => {
    if (!user || isSubscriptionLoading) {
      if (!isSubscriptionLoading) setIsLoading(false);
      return;
    }

    const fetchLimits = async () => {
      setIsLoading(true);

      try {
        // 1. Buscar plano do usuário (da tabela payments ou subscriptions)
        let currentPlan: 'free' | 'standard' | 'teams' | null = null;
        let planExpired = false;

        // Buscar pagamento mais recente
        const { data: payments } = await supabase
          .from('payments')
          .select('plan_name, expires_at, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Buscar subscription mais recente
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('plan_name, status, trial_ends_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Verificar plano ativo
        if (payments && payments.status === 'paid') {
          const planLower = payments.plan_name?.toLowerCase() || '';
          if (planLower.includes('free')) currentPlan = 'free';
          else if (planLower.includes('standard')) currentPlan = 'standard';
          else if (planLower.includes('teams')) currentPlan = 'teams';

          // Verificar se expirou
          if (payments.expires_at) {
            const expiresAt = parseISO(payments.expires_at);
            planExpired = isBefore(expiresAt, new Date());
          }
        } else if (subscriptions && (subscriptions.status === 'active' || subscriptions.status === 'trial')) {
          const planLower = subscriptions.plan_name?.toLowerCase() || '';
          if (planLower.includes('free')) currentPlan = 'free';
          else if (planLower.includes('standard')) currentPlan = 'standard';
          else if (planLower.includes('teams')) currentPlan = 'teams';
          else if (planLower.includes('teste') || planLower.includes('trial')) currentPlan = 'free'; // Trial = Free

          // Verificar se trial expirou
          if (subscriptions.trial_ends_at) {
            const trialEndsAt = parseISO(subscriptions.trial_ends_at);
            planExpired = isAfter(new Date(), trialEndsAt);
          }
        }

        // Se não tem plano, assumir free
        if (!currentPlan) {
          currentPlan = 'free';
        }

        // 2. Buscar negócios do usuário
        const { data: businesses, count: businessesCount } = await supabase
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id);

        const totalBusinesses = businessesCount || 0;

        // 3. Buscar agendamentos do mês atual
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        // Buscar todos os negócios do usuário
        const { data: userBusinesses } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id);

        const businessIds = userBusinesses?.map(b => b.id) || [];

        let appointmentsCount = 0;
        if (businessIds.length > 0) {
          const { count } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .in('business_id', businessIds)
            .gte('start_time', monthStart.toISOString())
            .lte('start_time', monthEnd.toISOString())
            .neq('status', 'cancelled');

          appointmentsCount = count || 0;
        }

        // 4. Definir limites baseados no plano
        let maxAppointments: number | null = null;
        let maxBusinesses: number | null = null;
        let hasFinancialManagement = false;
        let hasAdvancedReports = false;

        switch (currentPlan) {
          case 'free':
            maxAppointments = 30;
            maxBusinesses = 1;
            hasFinancialManagement = true; // Free tem gestão financeira
            hasAdvancedReports = false;
            break;
          case 'standard':
            maxAppointments = null; // Ilimitado
            maxBusinesses = 1;
            hasFinancialManagement = true;
            hasAdvancedReports = false;
            break;
          case 'teams':
            maxAppointments = null; // Ilimitado
            maxBusinesses = null; // Ilimitado
            hasFinancialManagement = true;
            hasAdvancedReports = true;
            break;
        }

        // 5. Calcular permissões
        const appointmentsRemaining = maxAppointments !== null 
          ? Math.max(0, maxAppointments - appointmentsCount)
          : null;

        const canCreateAppointment = planExpired 
          ? false
          : maxAppointments === null 
          ? true 
          : appointmentsCount < maxAppointments;

        const canCreateBusiness = planExpired
          ? false
          : maxBusinesses === null
          ? true
          : totalBusinesses < maxBusinesses;

        const canAccessFinance = hasFinancialManagement && !planExpired;
        const canAccessAdvancedReports = hasAdvancedReports && !planExpired;

        // 6. Atualizar estado
        setLimits({
          planName: currentPlan,
          maxAppointments,
          maxBusinesses,
          hasFinancialManagement,
          hasAdvancedReports,
          planExpired,
          appointmentsUsed: appointmentsCount,
          businessesCount: totalBusinesses,
          appointmentsRemaining,
          canCreateAppointment,
          canCreateBusiness,
          canAccessFinance,
          canAccessAdvancedReports,
        });
      } catch (error) {
        console.error('Erro ao buscar limites do plano:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLimits();
  }, [user, isSubscriptionLoading, refreshKey]);

  return {
    limits,
    isLoading,
    refresh,
  };
};
