import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { subDays, format } from 'date-fns';

interface AdminMetrics {
  totalBusinesses: number;
  totalUsers: number;
  totalAppointmentsLast30Days: number;
  totalRevenueLast30Days: number;
  isLoading: boolean;
}

export const useAdminMetrics = (): AdminMetrics => {
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalBusinesses: 0,
    totalUsers: 0,
    totalAppointmentsLast30Days: 0,
    totalRevenueLast30Days: 0,
    isLoading: true,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      setMetrics(prev => ({ ...prev, isLoading: true }));

      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);
      const startDate = format(thirtyDaysAgo, 'yyyy-MM-dd HH:mm:ss');
      const endDate = format(today, 'yyyy-MM-dd HH:mm:ss');

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

        // 3. Total Appointments (Last 30 days, pending/confirmed/completed)
        const { count: appointmentCount, error: appointmentError } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (appointmentError) throw appointmentError;

        // 4. Total Revenue (Last 30 days)
        let totalRevenue = 0;

        // 4a. Manual Revenues
        const { data: manualRevenueData, error: manualRevenueError } = await supabase
          .from('revenues')
          .select('amount')
          .gte('revenue_date', startDate)
          .lte('revenue_date', endDate);
        
        if (manualRevenueError) throw manualRevenueError;
        totalRevenue += manualRevenueData?.reduce((sum, item) => sum + parseFloat(item.amount as any), 0) || 0;

        // 4b. Appointment Revenues (Completed only)
        const { data: appointmentRevenueData, error: appointmentRevenueError } = await supabase
          .from('appointments')
          .select(`services (price)`)
          .eq('status', 'completed')
          .gte('start_time', startDate)
          .lte('start_time', endDate);
        
        if (appointmentRevenueError) throw appointmentRevenueError;
        
        (appointmentRevenueData || []).forEach(app => {
            const service = Array.isArray(app.services) ? app.services[0] : app.services;
            if (service && service.price) {
                totalRevenue += parseFloat(service.price as any);
            }
        });


        setMetrics({
          totalBusinesses: businessCount || 0,
          totalUsers: userCount || 0,
          totalAppointmentsLast30Days: appointmentCount || 0,
          totalRevenueLast30Days: totalRevenue,
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