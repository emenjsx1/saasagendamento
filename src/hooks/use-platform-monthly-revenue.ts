import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyData {
  name: string; // Nome do mês
  Receita: number;
}

interface UsePlatformMonthlyRevenueResult {
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

export const usePlatformMonthlyRevenue = (year: number): UsePlatformMonthlyRevenueResult => {
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

      // 1. Buscar Pagamentos de Assinatura Confirmados (Receita da Plataforma)
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('payment_type', 'subscription')
        .eq('status', 'confirmed')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (paymentError) {
        console.error("Error fetching platform revenues for admin chart:", paymentError);
        toast.error("Erro ao carregar dados de receita da plataforma para o gráfico.");
      }
      
      // 2. Agregar dados
      const aggregatedData = [...initialData];

      (paymentData || []).forEach(item => {
        const date = parseISO(item.payment_date);
        if (date.getFullYear() === year) {
          const monthIndex = getMonth(date);
          aggregatedData[monthIndex].Receita += parseFloat(item.amount as any);
        }
      });

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