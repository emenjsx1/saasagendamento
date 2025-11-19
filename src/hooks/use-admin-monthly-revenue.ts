import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyData {
  name: string; // Nome do mês
  Receita: number;
}

interface UseAdminMonthlyRevenueResult {
  data: MonthlyData[];
  isLoading: boolean;
}

const initializeMonthlyData = (year: number): MonthlyData[] => {
  const data: MonthlyData[] = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(year, i, 1);
    data.push({
      name: format(date, 'MMM', { locale: ptBR }), // Ex: Jan, Fev
      Receita: 0,
    });
  }
  return data;
};

export const useAdminMonthlyRevenue = (year: number): UseAdminMonthlyRevenueResult => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>(initializeMonthlyData(year));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      setIsLoading(true);
      const initialData = initializeMonthlyData(year);
      
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      
      const startDate = format(start, 'yyyy-MM-dd HH:mm:ss');
      const endDate = format(end, 'yyyy-MM-dd HH:mm:ss');

      // 1. Buscar Receitas Manuais (de todos os negócios)
      const { data: manualRevenueData, error: manualRevenueError } = await supabase
        .from('revenues')
        .select('amount, revenue_date')
        .gte('revenue_date', startDate)
        .lte('revenue_date', endDate);

      if (manualRevenueError) {
        console.error("Error fetching manual revenues for admin chart:", manualRevenueError);
        toast.error("Erro ao carregar dados de receita manual para o gráfico.");
      }
      
      // 2. Buscar Receitas de Agendamentos CONCLUÍDOS (de todos os negócios)
      const { data: appointmentRevenueData, error: appointmentRevenueError } = await supabase
        .from('appointments')
        .select(`start_time, services (price)`)
        .eq('status', 'completed')
        .gte('start_time', startDate)
        .lte('start_time', endDate);

      if (appointmentRevenueError) {
        console.error("Error fetching appointment revenues for admin chart:", appointmentRevenueError);
        toast.error("Erro ao carregar dados de receita de agendamentos para o gráfico.");
      }

      // 3. Agregar dados
      const aggregatedData = [...initialData];

      // Função auxiliar para agregar
      const aggregateData = (data: any[] | null, dateKey: string) => {
        (data || []).forEach(item => {
          const date = parseISO(item[dateKey]);
          if (date.getFullYear() === year) {
            const monthIndex = getMonth(date);
            
            if (dateKey === 'start_time') {
                // Receita de Agendamento
                const service = Array.isArray(item.services) ? item.services[0] : item.services;
                if (service && service.price) {
                    aggregatedData[monthIndex].Receita += parseFloat(service.price as any);
                }
            } else {
                // Receita Manual
                aggregatedData[monthIndex].Receita += parseFloat(item.amount as any);
            }
          }
        });
      };

      aggregateData(manualRevenueData, 'revenue_date');
      aggregateData(appointmentRevenueData, 'start_time');

      setMonthlyData(aggregatedData);
      setIsLoading(false);
    };

    fetchMonthlyData();
  }, [year]);

  return {
    data: monthlyData,
    isLoading,
  };
};