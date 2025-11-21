import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { toast } from 'sonner';

export interface AppointmentReport {
  id: string;
  client_name: string;
  client_whatsapp: string;
  client_email: string | null;
  client_code: string;
  service_name: string;
  service_price: number;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
}

export interface ClientReport {
  client_name: string;
  client_whatsapp: string;
  client_email: string | null;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_shows: number;
  total_revenue: number;
  last_visit: string | null;
  first_visit: string | null;
}

export interface RevenueReport {
  date: string;
  revenue: number;
  appointments_count: number;
}

export interface ServiceReport {
  service_id: string;
  service_name: string;
  total_appointments: number;
  total_revenue: number;
  average_price: number;
}

export interface SummaryMetrics {
  appointments_today: number;
  appointments_week: number;
  appointments_month: number;
  cancellations: number;
  reschedules: number;
  attendance_rate: number;
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
}

export const useReportsData = (businessId: string | null, startDate: Date, endDate: Date) => {
  const [summary, setSummary] = useState<SummaryMetrics>({
    appointments_today: 0,
    appointments_week: 0,
    appointments_month: 0,
    cancellations: 0,
    reschedules: 0,
    attendance_rate: 0,
    revenue_today: 0,
    revenue_week: 0,
    revenue_month: 0,
  });
  const [appointments, setAppointments] = useState<AppointmentReport[]>([]);
  const [clients, setClients] = useState<ClientReport[]>([]);
  const [revenue, setRevenue] = useState<RevenueReport[]>([]);
  const [services, setServices] = useState<ServiceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const start = format(startDate, 'yyyy-MM-dd 00:00:00');
        const end = format(endDate, 'yyyy-MM-dd 23:59:59');
        const today = format(new Date(), 'yyyy-MM-dd');
        const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

        // 1. Buscar agendamentos no período
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id,
            client_name,
            client_whatsapp,
            client_email,
            client_code,
            start_time,
            end_time,
            status,
            created_at,
            services (id, name, price)
          `)
          .eq('business_id', businessId)
          .gte('start_time', start)
          .lte('start_time', end)
          .order('start_time', { ascending: false });

        if (appointmentsError) {
          console.error('[REPORTS] Erro ao buscar agendamentos:', appointmentsError);
          toast.error('Erro ao carregar agendamentos');
        }

        // Processar agendamentos
        const processedAppointments: AppointmentReport[] = (appointmentsData || []).map((app: any) => {
          const service = Array.isArray(app.services) ? app.services[0] : app.services;
          return {
            id: app.id,
            client_name: app.client_name,
            client_whatsapp: app.client_whatsapp,
            client_email: app.client_email,
            client_code: app.client_code,
            service_name: service?.name || 'Serviço Desconhecido',
            service_price: service?.price || 0,
            start_time: app.start_time,
            end_time: app.end_time,
            status: app.status,
            created_at: app.created_at,
          };
        });

        setAppointments(processedAppointments);

        // 2. Calcular métricas de resumo
        const todayStart = format(startOfDay(new Date()), 'yyyy-MM-dd HH:mm:ss');
        const todayEnd = format(endOfDay(new Date()), 'yyyy-MM-dd HH:mm:ss');

        const { data: todayAppointments } = await supabase
          .from('appointments')
          .select('status, services (price)')
          .eq('business_id', businessId)
          .gte('start_time', todayStart)
          .lte('start_time', todayEnd);

        const { data: weekAppointments } = await supabase
          .from('appointments')
          .select('status, services (price)')
          .eq('business_id', businessId)
          .gte('start_time', `${weekStart} 00:00:00`)
          .lte('start_time', `${weekEnd} 23:59:59`);

        const { data: monthAppointments } = await supabase
          .from('appointments')
          .select('status, services (price)')
          .eq('business_id', businessId)
          .gte('start_time', `${monthStart} 00:00:00`)
          .lte('start_time', `${monthEnd} 23:59:59`);

        // Calcular receitas
        const calculateRevenue = (apps: any[]) => {
          return apps
            .filter((app: any) => app.status === 'completed')
            .reduce((sum: number, app: any) => {
              const service = Array.isArray(app.services) ? app.services[0] : app.services;
              return sum + (parseFloat(service?.price || 0));
            }, 0);
        };

        const appointments_today = todayAppointments?.length || 0;
        const appointments_week = weekAppointments?.length || 0;
        const appointments_month = monthAppointments?.length || 0;
        const cancellations = (appointmentsData || []).filter((a: any) => a.status === 'cancelled').length;
        const reschedules = 0; // TODO: Implementar quando tiver campo de remarcação
        const completed = (appointmentsData || []).filter((a: any) => a.status === 'completed').length;
        const total = appointmentsData?.length || 0;
        const attendance_rate = total > 0 ? (completed / total) * 100 : 0;

        setSummary({
          appointments_today,
          appointments_week,
          appointments_month,
          cancellations,
          reschedules,
          attendance_rate: Math.round(attendance_rate * 100) / 100,
          revenue_today: calculateRevenue(todayAppointments || []),
          revenue_week: calculateRevenue(weekAppointments || []),
          revenue_month: calculateRevenue(monthAppointments || []),
        });

        // 3. Processar relatório de clientes
        const clientMap = new Map<string, ClientReport>();

        processedAppointments.forEach((app) => {
          const key = app.client_whatsapp;
          const existing = clientMap.get(key) || {
            client_name: app.client_name,
            client_whatsapp: app.client_whatsapp,
            client_email: app.client_email,
            total_appointments: 0,
            completed_appointments: 0,
            cancelled_appointments: 0,
            no_shows: 0,
            total_revenue: 0,
            last_visit: null,
            first_visit: null,
          };

          existing.total_appointments++;
          if (app.status === 'completed') {
            existing.completed_appointments++;
            existing.total_revenue += app.service_price;
          } else if (app.status === 'cancelled') {
            existing.cancelled_appointments++;
          }

          const appDate = app.start_time;
          if (!existing.last_visit || appDate > existing.last_visit) {
            existing.last_visit = appDate;
          }
          if (!existing.first_visit || appDate < existing.first_visit) {
            existing.first_visit = appDate;
          }

          clientMap.set(key, existing);
        });

        setClients(Array.from(clientMap.values()).sort((a, b) => b.total_appointments - a.total_appointments));

        // 4. Processar receita por dia
        const revenueMap = new Map<string, RevenueReport>();

        processedAppointments
          .filter((app) => app.status === 'completed')
          .forEach((app) => {
            const date = format(parseISO(app.start_time), 'yyyy-MM-dd');
            const existing = revenueMap.get(date) || {
              date,
              revenue: 0,
              appointments_count: 0,
            };
            existing.revenue += app.service_price;
            existing.appointments_count++;
            revenueMap.set(date, existing);
          });

        setRevenue(
          Array.from(revenueMap.values())
            .sort((a, b) => a.date.localeCompare(b.date))
        );

        // 5. Processar relatório de serviços
        const serviceMap = new Map<string, ServiceReport>();

        processedAppointments.forEach((app) => {
          const key = app.service_name;
          const existing = serviceMap.get(key) || {
            service_id: '',
            service_name: app.service_name,
            total_appointments: 0,
            total_revenue: 0,
            average_price: 0,
          };

          existing.total_appointments++;
          if (app.status === 'completed') {
            existing.total_revenue += app.service_price;
          }
          existing.average_price = existing.total_revenue / existing.total_appointments;

          serviceMap.set(key, existing);
        });

        setServices(
          Array.from(serviceMap.values())
            .sort((a, b) => b.total_revenue - a.total_revenue)
        );

      } catch (error: any) {
        console.error('[REPORTS] Erro ao buscar dados:', error);
        toast.error('Erro ao carregar relatórios');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [businessId, startDate, endDate]);

  return {
    summary,
    appointments,
    clients,
    revenue,
    services,
    isLoading,
  };
};

