import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, MoreHorizontal, CheckCircle, XCircle, Filter, Calendar as CalendarIcon, RotateCcw, Clock, User, Briefcase, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { format, startOfDay, isSameHour, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateFilter } from '@/components/DateFilter';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn, formatCurrency } from '@/lib/utils';

type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';

interface Appointment {
  id: string;
  client_name: string;
  client_whatsapp: string;
  client_code: string; // Novo campo
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  services: {
    name: string;
    duration_minutes: number;
    price: number;
  };
}

const statusMap: Record<AppointmentStatus, { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
  completed: { label: 'Concluído', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
};

const AppointmentsPage: React.FC = () => {
  const { user } = useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('pending');
  const [filterDate, setFilterDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAppointments = useCallback(async () => {
    if (!user || !filterDate) return;

    setIsLoading(true);

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

    // 2. Construir Query de Agendamentos
    const startOfDayString = format(filterDate, 'yyyy-MM-dd 00:00:00');
    const endOfDayString = format(filterDate, 'yyyy-MM-dd 23:59:59');

    let query = supabase
      .from('appointments')
      .select(`
        id,
        client_name,
        client_whatsapp,
        client_code,
        start_time,
        end_time,
        status,
        services (name, duration_minutes, price)
      `)
      .eq('business_id', currentBusinessId)
      .gte('start_time', startOfDayString)
      .lte('start_time', endOfDayString);

    // Aplicar filtro de Status
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }
    
    // Ordenar por data de início
    query = query.order('start_time', { ascending: true });

    const { data: appointmentsData, error: appointmentsError } = await query;

    if (appointmentsError) {
      toast.error("Erro ao carregar agendamentos.");
      console.error(appointmentsError);
    } else {
      // Mapear os dados para garantir que o objeto services esteja no formato correto
      const mappedAppointments = appointmentsData.map(app => ({
          ...app,
          services: Array.isArray(app.services) ? app.services[0] : app.services,
      })) as Appointment[];
      
      setAppointments(mappedAppointments);
    }
    setIsLoading(false);
  }, [user, filterStatus, filterDate, refreshKey]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const updateAppointmentStatus = async (id: string, newStatus: AppointmentStatus) => {
    const loadingToastId = toast.loading(`Atualizando status para ${statusMap[newStatus].label}...`);
    
    try {
      const updates: any = { status: newStatus };

      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Força a atualização da lista
      setRefreshKey(prev => prev + 1); 
      toast.success(`Agendamento atualizado para ${statusMap[newStatus].label}.`, { id: loadingToastId });
      
    } catch (error: any) {
      toast.error(`Erro ao atualizar status: ${error.message}`, { id: loadingToastId });
      console.error(error);
    }
  };

  // Agrupamento por hora para a visualização de agenda
  const groupedAppointments = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    
    appointments.forEach(app => {
      const startTime = parseISO(app.start_time);
      const hourKey = format(startTime, 'HH:00');
      
      if (!groups.has(hourKey)) {
        groups.set(hourKey, []);
      }
      groups.get(hourKey)?.push(app);
    });

    // Ordenar as chaves (horas)
    return Array.from(groups.keys()).sort().map(hour => ({
      hour,
      appointments: groups.get(hour) || [],
    }));
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
        <p className="mb-4">Você precisa cadastrar as informações do seu negócio antes de gerenciar agendamentos.</p>
        <Button asChild>
          <a href="/register-business">Cadastrar Meu Negócio</a>
        </Button>
      </Card>
    );
  }

  const formattedDate = filterDate ? format(filterDate, 'EEEE, dd \'de\' MMMM', { locale: ptBR }) : 'Selecione uma Data';

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Agenda Diária</h1>
      
      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-lg">{formattedDate}</span>
        </div>
        
        <div className="flex items-center space-x-2 ml-auto">
          <DateFilter date={filterDate} setDate={setFilterDate} />
          <Button variant="outline" size="icon" onClick={() => setFilterDate(startOfDay(new Date()))} title="Voltar para Hoje">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-sm">Status:</span>
        </div>
        <ToggleGroup 
          type="single" 
          value={filterStatus} 
          onValueChange={(value: AppointmentStatus | 'all') => {
            if (value) setFilterStatus(value);
          }}
          className="flex flex-wrap justify-start"
        >
          <ToggleGroupItem value="pending" aria-label="Pendente" className="h-8 text-xs">
            Pendente
          </ToggleGroupItem>
          <ToggleGroupItem value="confirmed" aria-label="Confirmado" className="h-8 text-xs">
            Confirmado
          </ToggleGroupItem>
          <ToggleGroupItem value="completed" aria-label="Concluído" className="h-8 text-xs">
            Concluído
          </ToggleGroupItem>
          <ToggleGroupItem value="all" aria-label="Todos" className="h-8 text-xs">
            Todos
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Visualização da Agenda por Hora */}
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos do Dia ({appointments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {appointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum agendamento encontrado para esta data e status.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {groupedAppointments.map(({ hour, appointments: hourlyApps }) => (
                <div key={hour} className="flex border-b last:border-b-0">
                  {/* Coluna da Hora */}
                  <div className="w-20 flex-shrink-0 p-4 bg-gray-50 border-r flex items-start justify-center">
                    <span className="text-lg font-bold text-gray-700">{hour}</span>
                  </div>
                  
                  {/* Coluna dos Agendamentos */}
                  <div className="flex-grow p-4 space-y-4">
                    {hourlyApps.map((app) => {
                      const startTime = parseISO(app.start_time);
                      const endTime = parseISO(app.end_time);
                      const statusInfo = statusMap[app.status] || statusMap.pending;

                      return (
                        <Card 
                          key={app.id} 
                          className={cn(
                            "p-4 transition-all duration-200 hover:shadow-md",
                            app.status === 'confirmed' && 'border-l-4 border-primary',
                            app.status === 'completed' && 'border-l-4 border-green-500',
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>
                                <span className="text-xs font-medium text-muted-foreground flex items-center">
                                  <Tag className="h-3 w-3 mr-1" /> {app.client_code}
                                </span>
                              </div>
                              <p className="text-lg font-semibold flex items-center">
                                <User className="h-4 w-4 mr-2 text-primary" />
                                {app.client_name}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center">
                                <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                                {app.services.name} ({app.services.duration_minutes} min)
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                              </p>
                              <p className="text-md font-bold text-green-600 pt-1">
                                {formatCurrency(app.services.price)}
                              </p>
                            </div>
                            
                            {/* Ações */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Gerenciar Agendamento</DropdownMenuLabel>
                                {app.status !== 'confirmed' && (
                                  <DropdownMenuItem onClick={() => updateAppointmentStatus(app.id, 'confirmed')}>
                                    <CheckCircle className="h-4 w-4 mr-2" /> Confirmar
                                  </DropdownMenuItem>
                                )}
                                {app.status !== 'completed' && (
                                  <DropdownMenuItem onClick={() => updateAppointmentStatus(app.id, 'completed')}>
                                    Concluir (Registrar Receita)
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {/* Ação de Remarcar (Placeholder) */}
                                <DropdownMenuItem disabled>
                                  Remarcar (Em breve)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {app.status !== 'rejected' && (
                                  <DropdownMenuItem onClick={() => updateAppointmentStatus(app.id, 'rejected')}>
                                    <XCircle className="h-4 w-4 mr-2" /> Rejeitar
                                  </DropdownMenuItem>
                                )}
                                {app.status !== 'cancelled' && (
                                  <DropdownMenuItem onClick={() => updateAppointmentStatus(app.id, 'cancelled')}>
                                    Cancelar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentsPage;