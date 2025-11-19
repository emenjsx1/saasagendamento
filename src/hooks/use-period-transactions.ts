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
  source: 'manual' | 'appointment';
  serviceName?: string; // Para receitas de agendamento
}

interface UsePeriodTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  refresh: () => void;
}

export const usePeriodTransactions = (
  businessId: string | null,
  startDate: Date | null,
  endDate: Date | null,
  serviceId: string | null = null, // Novo parâmetro
): UsePeriodTransactionsResult => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    if (!businessId || !startDate || !endDate) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      setIsLoading(true);
      
      const startString = format(startDate, 'yyyy-MM-dd HH:mm:ss');
      const endString = format(endDate, 'yyyy-MM-dd HH:mm:ss');

      // 1. Buscar Receitas Manuais (Não são afetadas pelo filtro de serviço)
      let manualRevenues: Transaction[] = [];
      let expenses: Transaction[] = [];

      // Se houver filtro de serviço, só queremos ver transações de agendamento.
      // Se não houver filtro de serviço, buscamos todas as transações manuais e despesas.
      if (!serviceId) {
        const { data: manualRevenueData, error: manualRevenueError } = await supabase
          .from('revenues')
          .select('id, amount, description, revenue_date')
          .eq('business_id', businessId)
          .gte('revenue_date', startString)
          .lte('revenue_date', endString);

        if (manualRevenueError) {
          console.error("Error fetching manual revenues:", manualRevenueError);
          toast.error("Erro ao carregar receitas manuais.");
        }

        manualRevenues = (manualRevenueData || []).map(r => ({
          id: r.id,
          type: 'revenue',
          amount: parseFloat(r.amount as any),
          description: r.description || 'Receita Manual',
          date: parseISO(r.revenue_date),
          source: 'manual',
        }));
        
        // 3. Buscar Despesas
        const { data: expenseData, error: expenseError } = await supabase
          .from('expenses')
          .select('id, amount, description, category, expense_date')
          .eq('business_id', businessId)
          .gte('expense_date', startString)
          .lte('expense_date', endString);

        if (expenseError) {
          console.error("Error fetching expenses:", expenseError);
          toast.error("Erro ao carregar despesas.");
        }

        expenses = (expenseData || []).map(e => ({
          id: e.id,
          type: 'expense',
          amount: parseFloat(e.amount as any),
          description: e.description || 'Despesa',
          date: parseISO(e.expense_date),
          category: e.category,
          source: 'manual',
        }));
      }


      // 2. Buscar Receitas de Agendamentos CONCLUÍDOS
      let appointmentQuery = supabase
        .from('appointments')
        .select(`
          id, 
          client_name, 
          start_time, 
          services (name, price)
        `)
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

      const appointmentRevenues: Transaction[] = (appointmentRevenueData || []).map(app => {
        const service = Array.isArray(app.services) ? app.services[0] : app.services;
        const amount = service?.price ? parseFloat(service.price as any) : 0;
        
        return {
          id: app.id,
          type: 'revenue',
          amount: amount,
          description: `Serviço: ${service?.name || 'Desconhecido'} (Cliente: ${app.client_name})`,
          date: parseISO(app.start_time),
          source: 'appointment',
          serviceName: service?.name,
        };
      });

      // 4. Combinar e Ordenar
      const combinedTransactions = [...manualRevenues, ...appointmentRevenues, ...expenses].sort((a, b) => 
        b.date.getTime() - a.date.getTime()
      );

      setTransactions(combinedTransactions);
      setIsLoading(false);
    };

    fetchTransactions();
  }, [businessId, startDate, endDate, serviceId, refreshKey]);

  return {
    transactions,
    isLoading,
    refresh,
  };
};