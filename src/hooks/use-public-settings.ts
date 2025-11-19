import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PublicSubscriptionConfig {
  trial_days: number;
  base_prices: Record<'weekly' | 'monthly' | 'annual', number>;
}

interface UsePublicSettingsResult {
  subscriptionConfig: PublicSubscriptionConfig | null;
  isLoading: boolean;
}

const defaultSubscriptionConfig: PublicSubscriptionConfig = {
  trial_days: 3,
  base_prices: { weekly: 147, monthly: 588, annual: 7644 },
};

export const usePublicSettings = (): UsePublicSettingsResult => {
  const [config, setConfig] = useState<PublicSubscriptionConfig>(defaultSubscriptionConfig);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      
      // Busca apenas a coluna subscription_config
      const { data, error } = await supabase
        .from('platform_settings')
        .select('subscription_config')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching public settings:", error);
        // Em caso de erro, usamos os defaults
      } else if (data && data.subscription_config) {
        setConfig(data.subscription_config as PublicSubscriptionConfig);
      }
      
      setIsLoading(false);
    };

    fetchConfig();
  }, []);

  return {
    subscriptionConfig: config,
    isLoading,
  };
};