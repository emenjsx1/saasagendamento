import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';

export interface ClientAppointment {
  id: string;
  business_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  is_rated: boolean;
  client_code: string;
  services: {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
  };
  businesses: {
    id: string;
    name: string;
    slug: string | null;
    logo_url: string | null;
    theme_color: string | null;
  };
}

interface UseClientAppointmentsFilters {
  status?: AppointmentStatus | 'all';
  searchQuery?: string;
}

interface UseClientAppointmentsResult {
  appointments: ClientAppointment[];
  isLoading: boolean;
  error: Error | null;
  canRateCount: number;
  refresh: () => Promise<void>;
}

export function useClientAppointments(
  filters: UseClientAppointmentsFilters = {}
): UseClientAppointmentsResult {
  const { user } = useSession();
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAppointments = async () => {
    if (!user) {
      setIsLoading(false);
      setAppointments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Buscar email do usuário
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      const userEmail = profileData?.email || user.email;

      let query = supabase
        .from('appointments')
        .select(`
          id,
          business_id,
          start_time,
          end_time,
          status,
          is_rated,
          client_code,
          services (id, name, price, duration_minutes),
          businesses (id, name, slug, logo_url, theme_color)
        `)
        .order('start_time', { ascending: false });

      // Filtrar por user_id ou email
      if (userEmail) {
        query = query.or(`user_id.eq.${user.id},client_email.eq.${userEmail}`);
      } else {
        query = query.eq('user_id', user.id);
      }

      // Aplicar filtro de status
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Aplicar busca por nome do negócio
      if (filters.searchQuery) {
        // Busca será feita após buscar os dados, pois é em relação aninhada
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Processar dados
      let processedAppointments: ClientAppointment[] = (data || []).map((app: any) => ({
        id: app.id,
        business_id: app.business_id,
        start_time: app.start_time,
        end_time: app.end_time,
        status: app.status,
        is_rated: app.is_rated || false,
        client_code: app.client_code,
        services: Array.isArray(app.services) ? app.services[0] : app.services,
        businesses: Array.isArray(app.businesses) ? app.businesses[0] : app.businesses,
      }));

      // Aplicar busca por nome do negócio se necessário
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        processedAppointments = processedAppointments.filter(app =>
          app.businesses.name.toLowerCase().includes(searchLower)
        );
      }

      setAppointments(processedAppointments);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar agendamentos'));
      console.error('Erro ao buscar agendamentos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user, filters.status, filters.searchQuery]);

  // Contar agendamentos que podem ser avaliados
  const canRateCount = appointments.filter(
    app => app.status === 'completed' && !app.is_rated
  ).length;

  return {
    appointments,
    isLoading,
    error,
    canRateCount,
    refresh: fetchAppointments,
  };
}

