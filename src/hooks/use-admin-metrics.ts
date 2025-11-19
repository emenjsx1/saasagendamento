import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

interface SubscriptionStatusCount {
  active: number;
  trial: number;
  pending_payment: number;
  other: number;
}

interface AdminMetrics {
  totalBusinesses: number;
  totalUsers: number;
  totalAppointmentsLast30Days: number;
  totalRevenueLast30Days: number;
  appointmentsToday: number; // NEW
  revenueToday: number; // NEW
  subscriptionStatus: SubscriptionStatusCount; // NEW
  isLoading: boolean;
}

export const useAdminMetrics = (): AdminMetrics => {
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalBusinesses: 0,
    totalUsers: 0,
    totalAppointmentsLast30Days: 0,
    totalRevenueLast30Days: 0,
    appointmentsToday: 0,
    revenueToday: 0,
    subscriptionStatus: { active: 0, trial: 0, pending_payment: 0, other: 0 },
    isLoading: true,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      setMetrics(prev => ({ ...prev, isLoading: true }));

      const today = new Date();
      const startOfToday = format(startOfDay(today), 'yyyy-MM-dd HH:mm:ss');
      const endOfToday = format(endOfDay(today), 'yyyy-MM-dd HH:mm:ss');
      
      const thirtyDaysAgo = subDays(today, 30);
      const startDate30 = format(thirtyDaysAgo, 'yyyy-MM-dd HH:mm:ss');
      const endDate30 = format(today, 'yyyy-MM-dd HH:mm:ss');

      try {
        // 1. Total Businesses
        const { count: businessCount, error: businessError } = await supabase
          .from('businesses')
          .select('id', { count: 'exact', head: true });
        
        if (businessError) throw businessError;

        // 2. Total Users (Profiles)
        const { count: userCount, error: userError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        
        if (userError) throw userError;

        // 3. Total Appointments (Last 30 days, created)
        const { count: appointmentCount30, error: appointmentError30 } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startDate30)
          .lte('created_at', endDate30);
        
        if (appointmentError30) throw appointmentError30;
        
        // 4. Total Revenue (Last 30 days)
        let totalRevenue30 = 0;
        
        // 4a. Manual Revenues (30 days)
        const { data: manualRevenueData30, error: manualRevenueError30 } = await supabase
          .from('revenues')
          .select('amount')
          .gte('revenue_date', startDate30)
          .lte('revenue_date', endDate30);
        
        if (manualRevenueError30) throw manualRevenueError30;
        totalRevenue30 += manualRevenueData30?.reduce((sum, item) => sum + parseFloat(item.amount as any), 0) || 0;

        // 4b. Appointment Revenues (Completed, 30 days)
        const { data: appointmentRevenueData30, error: appointmentRevenueError30 } = await supabase
          .from('appointments')
          .select(`services (price)`)
          .eq('status', 'completed')
          .gte('start_time', startDate30)
          .lte('start_time', endDate30);
        
        if (appointmentRevenueError30) throw appointmentRevenueError30;
        
        (appointmentRevenueData30 || []).forEach(app => {
            const service = Array.isArray(app.services) ? app.services[0] : app.services;
            if (service && service.price) {
                totalRevenue30 += parseFloat(service.price as any);
            }
        });
        
        // --- Métricas de Hoje ---
        
        // 5. Agendamentos de Hoje (Pending/Confirmed)
        const { count: appointmentsToday, error: appointmentsTodayError } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'confirmed'])
          .gte('start_time', startOfToday)
          .lte('start_time', endOfToday);
          
        if (appointmentsTodayError) throw appointmentsTodayError;

        // 6. Receita de Hoje (Completed)
        let revenueToday = 0;
        
        // 6a. Manual Revenues (Today)
        const { data: manualRevenueDataToday, error: manualRevenueErrorToday } = await supabase
          .from('revenues')
          .select('amount')
          .gte('revenue_date', startOfToday)
          .lte('revenue_date', endOfToday);
        
        if (manualRevenueErrorToday) throw manualRevenueErrorToday;
        revenueToday += manualRevenueDataToday?.reduce((sum, item) => sum + parseFloat(item.amount as any), 0) || 0;

        // 6b. Appointment Revenues (Completed, Today)
        const { data: appointmentRevenueDataToday, error: appointmentRevenueErrorToday } = await supabase
          .from('appointments')
          .select(`services (price)`)
          .eq('status', 'completed')
          .gte('start_time', startOfToday)
          .lte('start_time', endOfToday);
        
        if (appointmentRevenueErrorToday) throw appointmentRevenueErrorToday;
        
        (appointmentRevenueDataToday || []).forEach(app => {
            const service = Array.isArray(app.services) ? app.services[0] : app.services;
            if (service && service.price) {
                revenueToday += parseFloat(service.price as any);
            }
        });
        
        // 7. Status das Assinaturas
        const { data: subscriptionsData, error: subscriptionsError } = await supabase
            .from('subscriptions')
            .select('status');
            
        if (subscriptionsError) throw subscriptionsError;
        
        const statusCounts: SubscriptionStatusCount = { active: 0, trial: 0, pending_payment: 0, other: 0 };
        
        (subscriptionsData || []).forEach(sub => {
            if (sub.status === 'active') statusCounts.active++;
            else if (sub.status === 'trial') statusCounts.trial++;
            else if (sub.status === 'pending_payment') statusCounts.pending_payment++;
            else statusCounts.other++;
        });


        setMetrics({
          totalBusinesses: businessCount || 0,
          totalUsers: userCount || 0,
          totalAppointmentsLast30Days: appointmentCount30 || 0,
          totalRevenueLast30Days: totalRevenue30,
          appointmentsToday: appointmentsToday || 0,
          revenueToday: revenueToday,
          subscriptionStatus: statusCounts,
          isLoading: false,
        });

      } catch (error: any) {
        console.error("Error fetching admin metrics:", error);
        toast.error("Erro ao carregar métricas administrativas: " + error.message);
        setMetrics(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchMetrics();
  }, []);

  return metrics;
};