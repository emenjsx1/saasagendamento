import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';

export interface Employee {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useEmployees = (businessId: string | null) => {
  const { T } = useCurrency();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar funcionários do negócio
  const fetchEmployees = useCallback(async () => {
    if (!businessId) {
      setEmployees([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', businessId)
        .order('name', { ascending: true });

      if (fetchError) {
        // Se a tabela não existe (404 ou PGRST205), não é um erro crítico
        if (fetchError.code === 'PGRST116' || fetchError.code === 'PGRST205' || fetchError.message?.includes('does not exist') || fetchError.message?.includes('Could not find the table') || fetchError.message?.includes('relation') || fetchError.status === 404) {
          console.warn('⚠️ Tabela employees não encontrada. Execute a migration create_employees_table.sql');
          setEmployees([]);
          setError('Tabela employees não encontrada. Execute as migrations no Supabase.');
          setIsLoading(false);
          return;
        }
        throw fetchError;
      }

      setEmployees(data || []);
    } catch (err: any) {
      // Se a tabela não existe, não mostrar erro
      if (err.code === 'PGRST116' || err.code === 'PGRST205' || err.message?.includes('does not exist') || err.message?.includes('Could not find the table') || err.message?.includes('relation') || err.status === 404) {
        console.warn('⚠️ Tabela employees não encontrada. Execute a migration create_employees_table.sql');
        setEmployees([]);
        setError('Tabela employees não encontrada. Execute as migrations no Supabase.');
        setIsLoading(false);
        return;
      }
      console.error('Erro ao buscar funcionários:', err);
      setError(err.message || 'Erro ao buscar funcionários');
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  // Buscar funcionários ativos
  const fetchActiveEmployees = useCallback(async () => {
    if (!businessId) {
      return [];
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      return data || [];
    } catch (err: any) {
      // Se a tabela não existe, não é um erro crítico
      if (err.code === 'PGRST116' || err.message?.includes('does not exist') || err.message?.includes('relation') || err.status === 404) {
        console.warn('⚠️ Tabela employees não encontrada. Execute a migration create_employees_table.sql');
        return [];
      }
      console.error('Erro ao buscar funcionários ativos:', err);
      return [];
    }
  }, [businessId]);

  // Criar funcionário
  const createEmployee = useCallback(async (employeeData: {
    name: string;
    phone?: string;
    email?: string;
  }): Promise<Employee | null> => {
    if (!businessId) {
      toast.error('ID do negócio não encontrado');
      return null;
    }

    try {
      const { data, error: createError } = await supabase
        .from('employees')
        .insert({
          business_id: businessId,
          name: employeeData.name.trim(),
          phone: employeeData.phone?.trim() || null,
          email: employeeData.email?.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        // Se a tabela não existe, mostrar mensagem específica
        if (createError.code === 'PGRST116' || createError.code === 'PGRST205' || createError.message?.includes('does not exist') || createError.message?.includes('Could not find the table') || createError.message?.includes('relation') || createError.status === 404) {
          toast.error(T('Execute a migration de funcionários no Supabase para usar esta funcionalidade. Veja o arquivo EXECUTAR_MIGRATIONS_FUNCIONARIOS.sql', 'Run the employees migration in Supabase to use this feature. See EXECUTAR_MIGRATIONS_FUNCIONARIOS.sql file'));
          return null;
        }
        throw createError;
      }

      await fetchEmployees();
      return data;
    } catch (err: any) {
      // Se a tabela não existe, mostrar mensagem específica
      if (err.code === 'PGRST116' || err.code === 'PGRST205' || err.message?.includes('does not exist') || err.message?.includes('Could not find the table') || err.message?.includes('relation') || err.status === 404) {
        toast.error(T('Execute a migration de funcionários no Supabase para usar esta funcionalidade. Veja o arquivo EXECUTAR_MIGRATIONS_FUNCIONARIOS.sql', 'Run the employees migration in Supabase to use this feature. See EXECUTAR_MIGRATIONS_FUNCIONARIOS.sql file'));
        return null;
      }
      console.error('Erro ao criar funcionário:', err);
      toast.error(err.message || 'Erro ao criar funcionário');
      return null;
    }
  }, [businessId, fetchEmployees, T]);

  // Atualizar funcionário
  const updateEmployee = useCallback(async (
    employeeId: string,
    employeeData: {
      name?: string;
      phone?: string;
      email?: string;
      is_active?: boolean;
    }
  ): Promise<Employee | null> => {
    try {
      const updateData: any = {};
      if (employeeData.name !== undefined) updateData.name = employeeData.name.trim();
      if (employeeData.phone !== undefined) updateData.phone = employeeData.phone?.trim() || null;
      if (employeeData.email !== undefined) updateData.email = employeeData.email?.trim() || null;
      if (employeeData.is_active !== undefined) updateData.is_active = employeeData.is_active;

      const { data, error: updateError } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', employeeId)
        .select()
        .single();

      if (updateError) {
        // Se a tabela não existe, mostrar mensagem específica
        if (updateError.code === 'PGRST116' || updateError.message?.includes('does not exist') || updateError.message?.includes('relation') || updateError.status === 404) {
          toast.error(T('Execute a migration de funcionários no Supabase para usar esta funcionalidade.', 'Run the employees migration in Supabase to use this feature.'));
          return null;
        }
        throw updateError;
      }

      await fetchEmployees();
      return data;
    } catch (err: any) {
      // Se a tabela não existe, mostrar mensagem específica
      if (err.code === 'PGRST116' || err.code === 'PGRST205' || err.message?.includes('does not exist') || err.message?.includes('Could not find the table') || err.message?.includes('relation') || err.status === 404) {
        toast.error(T('Execute a migration de funcionários no Supabase para usar esta funcionalidade. Veja o arquivo EXECUTAR_MIGRATIONS_FUNCIONARIOS.sql', 'Run the employees migration in Supabase to use this feature. See EXECUTAR_MIGRATIONS_FUNCIONARIOS.sql file'));
        return null;
      }
      console.error('Erro ao atualizar funcionário:', err);
      toast.error(err.message || 'Erro ao atualizar funcionário');
      return null;
    }
  }, [fetchEmployees, T]);

  // Deletar funcionário
  const deleteEmployee = useCallback(async (employeeId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (deleteError) {
        // Se a tabela não existe, mostrar mensagem específica
        if (deleteError.code === 'PGRST116' || deleteError.message?.includes('does not exist') || deleteError.message?.includes('relation') || deleteError.status === 404) {
          toast.error(T('Execute a migration de funcionários no Supabase para usar esta funcionalidade.', 'Run the employees migration in Supabase to use this feature.'));
          return false;
        }
        throw deleteError;
      }

      await fetchEmployees();
      return true;
    } catch (err: any) {
      // Se a tabela não existe, mostrar mensagem específica
      if (err.code === 'PGRST116' || err.message?.includes('does not exist') || err.message?.includes('relation') || err.status === 404) {
        toast.error(T('Execute a migration de funcionários no Supabase para usar esta funcionalidade.', 'Run the employees migration in Supabase to use this feature.'));
        return false;
      }
      console.error('Erro ao deletar funcionário:', err);
      toast.error(err.message || 'Erro ao deletar funcionário');
      return false;
    }
  }, [fetchEmployees, T]);

  // Carregar funcionários quando businessId mudar
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return {
    employees,
    isLoading,
    error,
    fetchEmployees,
    fetchActiveEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  };
};

