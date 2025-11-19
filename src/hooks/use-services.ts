import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

interface UseServicesResult {
  services: Service[];
  isLoading: boolean;
  refresh: () => void;
}

export const useServices = (businessId: string | null): UseServicesResult => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    if (!businessId) {
      setServices([]);
      setIsLoading(false);
      return;
    }

    const fetchServices = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('services')
        .select('id, name, duration_minutes, price, is_active')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error("Error fetching services:", error);
        toast.error("Erro ao carregar a lista de serviços.");
        setServices([]);
      } else {
        setServices(data as Service[]);
      }
      setIsLoading(false);
    };

    fetchServices();
  }, [businessId, refreshKey]);

  return {
    services,
    isLoading,
    refresh,
  };
};