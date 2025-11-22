import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { parseISO, differenceInDays } from 'date-fns';

export interface Subscription {
  id: string;
  plan_name: string;
  status: 'active' | 'trial' | 'pending_payment' | 'cancelled' | string;
  is_trial: boolean;
  trial_ends_at: string | null;
  created_at?: string;
}

interface UseSubscriptionResult {
  subscription: Subscription | null;
  daysLeft: number | null;
  isLoading: boolean;
  refresh: () => void;
}

export const useSubscription = (): UseSubscriptionResult => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    if (isSessionLoading || !user) {
      if (!isSessionLoading) setIsLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      setIsLoading(true);
      
      // Busca a assinatura do usuário
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, plan_name, status, is_trial, trial_ends_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) // Pega a mais recente
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching subscription:", error);
        toast.error("Erro ao carregar status da assinatura.");
        setSubscription(null);
        setDaysLeft(null);
      } else if (data) {
        setSubscription(data as Subscription);
        
        // Calcula dias restantes se for trial
        if (data.is_trial && data.trial_ends_at) {
          const endDate = parseISO(data.trial_ends_at);
          const today = new Date();
          const days = differenceInDays(endDate, today);
          setDaysLeft(days > 0 ? days : 0);
        } else {
          setDaysLeft(null);
        }
      } else {
        setSubscription(null);
        setDaysLeft(null);
      }
      
      setIsLoading(false);
    };

    fetchSubscription();
  }, [user, isSessionLoading, refreshKey]);

  return {
    subscription,
    daysLeft,
    isLoading,
    refresh,
  };
};