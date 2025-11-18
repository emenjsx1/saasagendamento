import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfDay, addDays } from 'date-fns';

interface AppointmentSummary {
  todayCount: number;
  weekCount: number;
  isLoading: boolean;
}

export const useAppointmentsSummary = (businessId: string | null): AppointmentSummary => {
  const [summary, setSummary] = useState<AppointmentSummary>({
    todayCount: 0,
    weekCount: 0,
    isLoading: true,
  });

  useEffect(() => {
    if (!businessId) {
      setSummary(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchSummary = async () => {
      setSummary(prev => ({ ...prev, isLoading: true }));

      const today = startOfDay(new Date());
      // Inicia a semana na Segunda-feira (1)
      const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); 
      const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 });

      // 1. Buscar Agendamentos de Hoje (Pendentes ou Confirmados)
      const { count: todayCount, error: todayError } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('start_time', format(today, 'yyyy-MM-dd HH:mm:ss'))
        .lt('start_time', format(addDays(today, 1), 'yyyy-MM-dd HH:mm:ss'))
        .in('status', ['pending', 'confirmed']);

      if (todayError) {
        console.error("Error fetching today's appointments:", todayError);
      }

      // 2. Buscar Agendamentos da Semana (Pendentes ou Confirmados)
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
        todayCount: todayCount || 0,
        weekCount: weekCount || 0,
        isLoading: false,
      });
    };

    fetchSummary();
  }, [businessId]);

  return summary;
};