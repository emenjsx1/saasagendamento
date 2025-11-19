import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PeriodSummary {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  isLoading: boolean;
}

export const usePeriodFinanceSummary = (
  businessId: string | null, 
  startDate: Date | null, 
  endDate: Date | null,
  serviceId: string | null = null, // Novo parâmetro
): PeriodSummary => {
  const [summary, setSummary] = useState<PeriodSummary>({
    totalRevenue: 0,
    totalExpense: 0,
    netProfit: 0,
    isLoading: true,
  });

  useEffect(() => {
    if (!businessId || !startDate || !endDate) {
      setSummary(prev => ({ ...prev, isLoading: false, totalRevenue: 0, totalExpense: 0, netProfit: 0 }));
      return;
    }

    const fetchSummary = async () => {
      setSummary(prev => ({ ...prev, isLoading: true }));

      const startString = format(startDate, 'yyyy-MM-dd HH:mm:ss');
      const endString = format(endDate, 'yyyy-MM-dd HH:mm:ss');

      let totalManualRevenue = 0;
      let totalExpense = 0;

      // Se não houver filtro de serviço, buscamos receitas manuais e despesas.
      if (!serviceId) {
        // 1. Buscar Receitas Manuais
        const { data: manualRevenueData, error: manualRevenueError } = await supabase
          .from('revenues')
          .select('amount')
          .eq('business_id', businessId)
          .gte('revenue_date', startString)
          .lte('revenue_date', endString);

        if (manualRevenueError) {
          console.error("Error fetching manual revenues:", manualRevenueError);
          toast.error("Erro ao carregar receitas manuais.");
        }
        totalManualRevenue = manualRevenueData?.reduce((sum, item) => sum + parseFloat(item.amount as any), 0) || 0;

        // 3. Buscar Despesas
        const { data: expenseData, error: expenseError } = await supabase
          .from('expenses')
          .select('amount')
          .eq('business_id', businessId)
          .gte('expense_date', startString)
          .lte('expense_date', endString);

        if (expenseError) {
          console.error("Error fetching expenses:", expenseError);
          toast.error("Erro ao carregar despesas.");
        }

        totalExpense = expenseData?.reduce((sum, item) => sum + parseFloat(item.amount as any), 0) || 0;
      }


      // 2. Buscar Receitas de Agendamentos CONCLUÍDOS
      let appointmentQuery = supabase
        .from('appointments')
        .select(`services (price)`)
        .eq('business_id', businessId)
        .eq('status', 'completed')
        .gte('start_time', startString)
        .lte('start_time', endString);
        
      if (serviceId) {
        appointmentQuery = appointmentQuery.eq('service_id', serviceId);
      }

      const { data: appointmentRevenueData, error: appointmentRevenueError } = await appointmentQuery;

      if (appointmentRevenueError) {
        console.error("Error fetching appointment revenues:", appointmentRevenueError);
        toast.error("Erro ao carregar receitas de agendamentos.");
      }
      
      let totalAppointmentRevenue = 0;
      (appointmentRevenueData || []).forEach(app => {
        const service = Array.isArray(app.services) ? app.services[0] : app.services;
        if (service && service.price) {
          totalAppointmentRevenue += parseFloat(service.price as any);
        }
      });

      const totalRevenue = totalManualRevenue + totalAppointmentRevenue;
      
      const netProfit = totalRevenue - totalExpense;

      setSummary({
        totalRevenue,
        totalExpense,
        netProfit,
        isLoading: false,
      });
    };

    fetchSummary();
  }, [businessId, startDate, endDate, serviceId]);

  return summary;
};