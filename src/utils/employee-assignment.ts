import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

/**
 * Distribui automaticamente um agendamento para um funcionário usando round-robin
 * Retorna o ID do funcionário que deve receber o agendamento
 * 
 * @param businessId - ID do negócio
 * @param date - Data do agendamento
 * @param time - Hora do agendamento (formato "HH:mm")
 * @returns ID do funcionário ou null se não houver funcionários ativos
 */
export const assignEmployeeAutomatically = async (
  businessId: string,
  date: Date,
  time: string
): Promise<string | null> => {
  try {
    // 1. Buscar todos os funcionários ativos do negócio
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (employeesError) {
      // Se a tabela não existe (404), retornar null silenciosamente
      if (employeesError.status === 404 || employeesError.message?.includes('does not exist') || employeesError.message?.includes('relation')) {
        console.warn('⚠️ Tabela employees não encontrada. Execute a migration create_employees_table.sql');
        return null;
      }
      console.error('Erro ao buscar funcionários:', employeesError);
      return null;
    }

    if (!employees || employees.length === 0) {
      console.warn('Nenhum funcionário ativo encontrado para o negócio');
      return null;
    }

    // 2. Buscar agendamentos do dia para contar quantos cada funcionário tem
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const dayStartString = format(dayStart, 'yyyy-MM-dd 00:00:00');
    const dayEndString = format(dayEnd, 'yyyy-MM-dd 23:59:59');

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('employee_id')
      .eq('business_id', businessId)
      .gte('start_time', dayStartString)
      .lte('start_time', dayEndString)
      .in('status', ['pending', 'confirmed']); // Apenas agendamentos ativos

    if (appointmentsError) {
      console.error('Erro ao buscar agendamentos:', appointmentsError);
      // Continuar mesmo com erro, usar round-robin simples
    }

    // 3. Contar quantos agendamentos cada funcionário tem no dia
    const appointmentCounts: Record<string, number> = {};
    
    // Inicializar contadores com 0
    employees.forEach(emp => {
      appointmentCounts[emp.id] = 0;
    });

    // Contar agendamentos existentes
    if (appointments) {
      appointments.forEach(apt => {
        if (apt.employee_id && appointmentCounts.hasOwnProperty(apt.employee_id)) {
          appointmentCounts[apt.employee_id]++;
        }
      });
    }

    // 4. Encontrar funcionário com menos agendamentos (round-robin)
    let selectedEmployeeId: string | null = null;
    let minCount = Infinity;

    employees.forEach(emp => {
      const count = appointmentCounts[emp.id] || 0;
      if (count < minCount) {
        minCount = count;
        selectedEmployeeId = emp.id;
      }
    });

    // Se todos têm a mesma quantidade, escolher o primeiro (ou aleatório)
    if (selectedEmployeeId === null && employees.length > 0) {
      selectedEmployeeId = employees[0].id;
    }

    console.log('📊 Distribuição automática:', {
      businessId,
      date: format(date, 'yyyy-MM-dd'),
      time,
      employeesCount: employees.length,
      appointmentCounts,
      selectedEmployee: employees.find(e => e.id === selectedEmployeeId)?.name,
    });

    return selectedEmployeeId;
  } catch (error) {
    console.error('Erro ao distribuir funcionário automaticamente:', error);
    return null;
  }
};

