import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { Loader2, CalendarCheck, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppointmentsChart from '@/components/AppointmentsChart';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
  start_time: string;
  services: {
    name: string;
    price: number;
  };
}

interface ServiceSummary {
  name: string;
  count: number;
}

const statusColors: Record<Appointment['status'], string> = {
  pending: 'hsl(var(--secondary))',
  confirmed: 'hsl(var(--primary))',
  rejected: 'hsl(var(--destructive))',
  completed: 'hsl(142 71% 45%)', // Green for success
  cancelled: 'hsl(var(--muted-foreground))',
};

const DashboardPage = () => {
  const { user } = useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      // 1. Buscar Business ID
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (businessError && businessError.code !== 'PGRST116') {
        toast.error("Erro ao carregar o negócio.");
        console.error(businessError);
        setIsLoading(false);
        return;
      }

      if (!businessData) {
        setBusinessId(null);
        setIsLoading(false);
        return;
      }

      const currentBusinessId = businessData.id;
      setBusinessId(currentBusinessId);

      // 2. Buscar Agendamentos (últimos 30 dias para o resumo)
      const thirtyDaysAgo = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          status,
          start_time,
          services (name, price)
        `)
        .eq('business_id', currentBusinessId)
        .gte('start_time', thirtyDaysAgo)
        .order('start_time', { ascending: false });

      if (appointmentsError) {
        toast.error("Erro ao carregar dados do dashboard.");
        console.error(appointmentsError);
      } else {
        const mappedAppointments = appointmentsData.map(app => ({
            ...app,
            services: Array.isArray(app.services) ? app.services[0] : app.services,
        })) as Appointment[];
        
        setAppointments(mappedAppointments);
      }
      setIsLoading(false);
    };

    fetchDashboardData();
  }, [user]);

  // Cálculos de Resumo
  const { totalAppointments, confirmedAppointments, totalRevenue, chartData, popularServices } = useMemo(() => {
    const totalAppointments = appointments.length;
    const confirmedAppointments = appointments.filter(a => a.status === 'confirmed' || a.status === 'completed').length;
    
    const totalRevenue = appointments
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.services?.price || 0), 0);

    const statusCounts = appointments.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<Appointment['status'], number>);

    const chartData: { name: string, count: number, fill: string }[] = [
      { name: 'Confirmados', count: statusCounts.confirmed || 0, fill: statusColors.confirmed },
      { name: 'Pendentes', count: statusCounts.pending || 0, fill: statusColors.pending },
      { name: 'Concluídos', count: statusCounts.completed || 0, fill: statusColors.completed },
      { name: 'Rejeitados', count: statusCounts.rejected || 0, fill: statusColors.rejected },
    ];

    const serviceCounts = appointments.reduce((acc, app) => {
      const serviceName = app.services?.name || 'Serviço Desconhecido';
      acc[serviceName] = (acc[serviceName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const popularServices: ServiceSummary[] = Object.entries(serviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { totalAppointments, confirmedAppointments, totalRevenue, chartData, popularServices };
  }, [appointments]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!businessId) {
    return (
      <Card className="p-6 text-center">
        <CardTitle className="text-xl mb-4">Negócio Não Cadastrado</CardTitle>
        <p className="mb-4">Você precisa cadastrar as informações do seu negócio antes de visualizar o painel.</p>
        <Button asChild>
          <a href="/register-business">Cadastrar Meu Negócio</a>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Visão Geral do Negócio</h1>
      <p className="text-gray-600">Resumo dos últimos 30 dias.</p>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {confirmedAppointments} confirmados/concluídos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Estimada (Concluídos)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Baseado em agendamentos com status 'Concluído'.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Agendamento</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {appointments.length > 0 ? (
              <div className="text-lg font-bold">
                {format(new Date(appointments[0].start_time), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </div>
            ) : (
              <div className="text-lg font-bold">Nenhum</div>
            )}
            <p className="text-xs text-muted-foreground">
              {appointments.length > 0 ? appointments[0].services.name : 'Agende um serviço!'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Popular Services */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AppointmentsChart data={chartData} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Serviços Mais Populares</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {popularServices.length > 0 ? (
                popularServices.map((service, index) => (
                  <li key={index} className="flex justify-between items-center text-sm border-b pb-1 last:border-b-0">
                    <span>{service.name}</span>
                    <Badge variant="secondary">{service.count}</button>
                  </li>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum serviço agendado recentemente.</p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;