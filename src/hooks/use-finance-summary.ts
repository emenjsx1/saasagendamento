import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface FinanceSummary {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  isLoading: boolean;
}

export const useFinanceSummary = (businessId: string | null): FinanceSummary => {
  const [summary, setSummary] = useState<FinanceSummary>({
    totalRevenue: 0,
    totalExpense: 0,
    netProfit: 0,
    isLoading: true,
  });

  useEffect(() => {
    if (!businessId) {
      setSummary(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchSummary = async () => {
      setSummary(prev => ({ ...prev, isLoading: true }));

      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      const startDate = format(start, 'yyyy-MM-dd HH:mm:ss');
      const endDate = format(end, 'yyyy-MM-dd HH:mm:ss');

      // 1. Buscar Receitas
      const { data: revenueData, error: revenueError } = await supabase
        .from('revenues')
        .select('amount')
        .eq('business_id', businessId)
        .gte('revenue_date', startDate)
        .lte('revenue_date', endDate);

      if (revenueError) {
        console.error("Error fetching revenues:", revenueError);
        toast.error("Erro ao carregar receitas.");
      }

      const totalRevenue = revenueData?.reduce((sum, item) => sum + parseFloat(item.amount as any), 0) || 0;

      // 2. Buscar Despesas
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('business_id', businessId)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);

      if (expenseError) {
        console.error("Error fetching expenses:", expenseError);
        toast.error("Erro ao carregar despesas.");
      }

      const totalExpense = expenseData?.reduce((sum, item) => sum + parseFloat(item.amount as any), 0) || 0;
      
      const netProfit = totalRevenue - totalExpense;

      setSummary({
        totalRevenue,
        totalExpense,
        netProfit,
        isLoading: false,
      });
    };

    fetchSummary();
  }, [businessId]);

  return summary;
};