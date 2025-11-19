import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface AppointmentRevenue {
  totalRevenue: number;
  isLoading: boolean;
}

export const useAppointmentRevenue = (businessId: string | null): AppointmentRevenue => {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setTotalRevenue(0);
      setIsLoading(false);
      return;
    }

    const fetchRevenue = async () => {
      setIsLoading(true);

      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      const startDate = format(start, 'yyyy-MM-dd HH:mm:ss');
      const endDate = format(end, 'yyyy-MM-dd HH:mm:ss');

      // Buscar agendamentos CONCLUÍDOS no mês atual
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          services (price)
        `)
        .eq('business_id', businessId)
        .eq('status', 'completed')
        .gte('start_time', startDate)
        .lte('start_time', endDate);

      if (error) {
        console.error("Error fetching appointment revenue:", error);
        toast.error("Erro ao carregar receita de agendamentos.");
        setTotalRevenue(0);
      } else {
        let revenue = 0;
        data.forEach(app => {
          // O join retorna 'services' que pode ser um objeto ou um array de objetos
          const service = Array.isArray(app.services) ? app.services[0] : app.services;
          if (service && service.price) {
            revenue += parseFloat(service.price as any);
          }
        });
        setTotalRevenue(revenue);
      }
      setIsLoading(false);
    };

    fetchRevenue();
  }, [businessId]);

  return {
    totalRevenue,
    isLoading,
  };
};