import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfDay, addDays } from 'date-fns';

interface AppointmentSummary {
  periodCount: number;
  weekCount: number;
  isLoading: boolean;
}

export const useAppointmentsSummary = (
  businessId: string | null, 
  startDate: Date | null, 
  endDate: Date | null
): AppointmentSummary => {
  const [summary, setSummary] = useState<AppointmentSummary>({
    periodCount: 0,
    weekCount: 0,
    isLoading: true,
  });

  useEffect(() => {
    if (!businessId) {
      setSummary(prev => ({ ...prev, isLoading: false, periodCount: 0 }));
      return;
    }

    const fetchSummary = async () => {
      setSummary(prev => ({ ...prev, isLoading: true }));

      // Configuração para o período dinâmico (startDate a endDate)
      const startPeriodString = startDate ? format(startDate, 'yyyy-MM-dd HH:mm:ss') : null;
      const endPeriodString = endDate ? format(endDate, 'yyyy-MM-dd HH:mm:ss') : null;

      let periodCount = 0;
      
      if (startPeriodString && endPeriodString) {
        // 1. Buscar Agendamentos do Período (Pendentes ou Confirmados)
        const { count, error } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .gte('start_time', startPeriodString)
          .lte('start_time', endPeriodString)
          .in('status', ['pending', 'confirmed']);

        if (error) {
          console.error("Error fetching period appointments:", error);
          toast.error("Erro ao carregar agendamentos do período.");
        }
        periodCount = count || 0;
      }


      // 2. Buscar Agendamentos da Semana (Mantido para o card de resumo semanal)
      const today = startOfDay(new Date());
      const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); 
      const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 });
      
      const { count: weekCount, error: weekError } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('start_time', format(startOfCurrentWeek, 'yyyy-MM-dd HH:mm:ss'))
        .lte('start_time', format(endOfCurrentWeek, 'yyyy-MM-dd HH:mm:ss'))
        .in('status', ['pending', 'confirmed']);

      if (weekError) {
        console.error("Error fetching week's appointments:", weekError);
      }

      setSummary({
        periodCount: periodCount,
        weekCount: weekCount || 0,
        isLoading: false,
      });
    };

    fetchSummary();
  }, [businessId, startDate, endDate]);

  return summary;
};