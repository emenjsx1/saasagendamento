import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/integrations/supabase/session-context';

interface DaySchedule {
  day: string;
  is_open: boolean;
  start_time: string;
  end_time: string;
}

interface BusinessSchedule {
  id: string;
  working_hours: DaySchedule[] | null;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface UseBusinessScheduleResult {
  businessSchedule: BusinessSchedule | null;
  services: Service[];
  isLoading: boolean;
  businessId: string | null;
}

export const useBusinessSchedule = (): UseBusinessScheduleResult => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [businessSchedule, setBusinessSchedule] = useState<BusinessSchedule | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    if (isSessionLoading || !user) {
      if (!isSessionLoading) setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      
      // 1. Buscar Business ID e Horários
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, working_hours')
        .eq('owner_id', user.id)
        .single();

      if (businessError && businessError.code !== 'PGRST116') {
        toast.error("Erro ao carregar dados do negócio.");
        console.error(businessError);
        setIsLoading(false);
        return;
      }

      if (!businessData) {
        setIsLoading(false);
        return;
      }
      
      setBusinessId(businessData.id);
      setBusinessSchedule(businessData as BusinessSchedule);

      // 2. Buscar Serviços
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, duration_minutes, price')
        .eq('business_id', businessData.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (servicesError) {
        toast.error("Erro ao carregar serviços.");
        console.error(servicesError);
      } else {
        setServices(servicesData as Service[]);
      }
      
      setIsLoading(false);
    };

    fetchData();
  }, [user, isSessionLoading]);

  return {
    businessSchedule,
    services,
    isLoading,
    businessId,
  };
};