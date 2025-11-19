import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfYear, endOfYear, parseISO, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyData {
  name: string; // Nome do mês
  Receita: number;
  Despesa: number;
}

interface UseMonthlyFinanceDataResult {
  data: MonthlyData[];
  isLoading: boolean;
}

const initializeMonthlyData = (): MonthlyData[] => {
  const data: MonthlyData[] = [];
  for (let i = 0; i < 12; i++) {
    // Cria uma data fictícia para o mês 'i' do ano atual para obter o nome do mês
    const date = new Date(new Date().getFullYear(), i, 1);
    data.push({
      name: format(date, 'MMM', { locale: ptBR }), // Ex: Jan, Fev
      Receita: 0,
      Despesa: 0,
    });
  }
  return data;
};

export const useMonthlyFinanceData = (businessId: string | null): UseMonthlyFinanceDataResult => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>(initializeMonthlyData());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setMonthlyData(initializeMonthlyData());
      setIsLoading(false);
      return;
    }

    const fetchMonthlyData = async () => {
      setIsLoading(true);
      const initialData = initializeMonthlyData();
      
      const start = startOfYear(new Date());
      const end = endOfYear(new Date());
      const startDate = format(start, 'yyyy-MM-dd HH:mm:ss');
      const endDate = format(end, 'yyyy-MM-dd HH:mm:ss');

      // 1. Buscar Receitas do Ano
      const { data: revenueData, error: revenueError } = await supabase
        .from('revenues')
        .select('amount, revenue_date')
        .eq('business_id', businessId)
        .gte('revenue_date', startDate)
        .lte('revenue_date', endDate);

      if (revenueError) {
        console.error("Error fetching revenues for chart:", revenueError);
        toast.error("Erro ao carregar dados de receita para o gráfico.");
      }

      // 2. Buscar Despesas do Ano
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .eq('business_id', businessId)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);

      if (expenseError) {
        console.error("Error fetching expenses for chart:", expenseError);
        toast.error("Erro ao carregar dados de despesa para o gráfico.");
      }

      // 3. Agregar dados
      const aggregatedData = [...initialData];

      (revenueData || []).forEach(r => {
        const date = parseISO(r.revenue_date);
        const monthIndex = getMonth(date);
        aggregatedData[monthIndex].Receita += parseFloat(r.amount as any);
      });

      (expenseData || []).forEach(e => {
        const date = parseISO(e.expense_date);
        const monthIndex = getMonth(date);
        aggregatedData[monthIndex].Despesa += parseFloat(e.amount as any);
      });

      setMonthlyData(aggregatedData);
      setIsLoading(false);
    };

    fetchMonthlyData();
  }, [businessId]);

  return {
    data: monthlyData,
    isLoading,
  };
};