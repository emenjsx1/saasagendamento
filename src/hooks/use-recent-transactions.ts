import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export interface Transaction {
  id: string;
  type: 'revenue' | 'expense';
  amount: number;
  description: string;
  date: Date;
  category?: string;
}

interface UseRecentTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  refresh: () => void;
}

export const useRecentTransactions = (businessId: string | null): UseRecentTransactionsResult => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    if (!businessId) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      setIsLoading(true);

      // 1. Buscar Receitas
      const { data: revenueData, error: revenueError } = await supabase
        .from('revenues')
        .select('id, amount, description, revenue_date, created_at')
        .eq('business_id', businessId)
        .order('revenue_date', { ascending: false })
        .limit(50); // Limitar para transações recentes

      if (revenueError) {
        console.error("Error fetching revenues:", revenueError);
        toast.error("Erro ao carregar receitas.");
      }

      const revenues: Transaction[] = (revenueData || []).map(r => ({
        id: r.id,
        type: 'revenue',
        amount: parseFloat(r.amount as any),
        description: r.description || 'Receita',
        date: parseISO(r.revenue_date),
      }));

      // 2. Buscar Despesas
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('id, amount, description, category, expense_date, created_at')
        .eq('business_id', businessId)
        .order('expense_date', { ascending: false })
        .limit(50); // Limitar para transações recentes

      if (expenseError) {
        console.error("Error fetching expenses:", expenseError);
        toast.error("Erro ao carregar despesas.");
      }

      const expenses: Transaction[] = (expenseData || []).map(e => ({
        id: e.id,
        type: 'expense',
        amount: parseFloat(e.amount as any),
        description: e.description || 'Despesa',
        date: parseISO(e.expense_date),
        category: e.category,
      }));

      // 3. Combinar e Ordenar
      const combinedTransactions = [...revenues, ...expenses].sort((a, b) => 
        b.date.getTime() - a.date.getTime()
      );

      setTransactions(combinedTransactions);
      setIsLoading(false);
    };

    fetchTransactions();
  }, [businessId, refreshKey]);

  return {
    transactions,
    isLoading,
    refresh,
  };
};