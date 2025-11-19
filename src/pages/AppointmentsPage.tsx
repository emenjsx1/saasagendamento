import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, MoreHorizontal, CheckCircle, XCircle, Filter, Calendar as CalendarIcon, RotateCcw, Clock, User, Briefcase, Tag, Repeat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { format, startOfDay, parseISO, isToday, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateFilter } from '@/components/DateFilter';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn, formatCurrency } from '@/lib/utils';
import RescheduleDialog from '@/components/RescheduleDialog';
import { useBusinessSchedule } from '@/hooks/use-business-schedule';

type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface Appointment {
  id: string;
  client_name: string;
  client_whatsapp: string;
  client_code: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  services: Service;
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
  const { businessSchedule, businessId, isLoading: isScheduleLoading } = useBusinessSchedule();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('pending');
  const [filterDate, setFilterDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!user || !filterDate || !businessId) return;

    setIsLoadingAppointments(true);

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
        services (id, name, duration_minutes, price)
      `)
      .eq('business_id', businessId)
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
    setIsLoadingAppointments(false);
  }, [user, filterStatus, filterDate, businessId, refreshKey]);

  useEffect(() => {
    if (businessId) {
      fetchAppointments();
    }
  }, [fetchAppointments, businessId]);

  const handleRescheduleClick = (app: Appointment) => {
    setSelectedAppointment(app);
    setIsRescheduleModalOpen(true);
  };

  const handleRescheduleSuccess = () => {
    // Força a atualização da lista
    setRefreshKey(prev => prev + 1); 
  };

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

  // Geração de todas as horas do dia (00:00 a 23:00) e mapeamento dos agendamentos
  const hourlySchedule = useMemo(() => {
    const schedule = [];
    const appointmentsByHour = new Map<string, Appointment[]>();

    // 1. Mapear agendamentos existentes por hora de início
    appointments.forEach(app => {
      const startTime = parseISO(app.start_time);
      const hourKey = format(startTime, 'HH:00');
      
      if (!appointmentsByHour.has(hourKey)) {
        appointmentsByHour.set(hourKey, []);
      }
      // CORREÇÃO: Usar appointmentsByHour em vez de groups
      appointmentsByHour.get(hourKey)?.push(app);
    });

    // 2. Gerar todas as 24 horas do dia
    for (let h = 0; h < 24; h++) {
      const hourDate = setMinutes(setHours(new Date(), h), 0);
      const hourKey = format(hourDate, 'HH:00');
      
      schedule.push({
        hour: hourKey,
        appointments: appointmentsByHour.get(hourKey) || [],
      });
    }

    return schedule;
  }, [appointments]);

  if (isScheduleLoading || isLoadingAppointments) {
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
          <div className="divide-y divide-gray-100">
            {hourlySchedule.map(({ hour, appointments: hourlyApps }) => (
              <div key={hour} className="flex border-b last:border-b-0">
                {/* Coluna da Hora */}
                <div className="w-20 flex-shrink-0 p-4 bg-gray-50 border-r flex items-start justify-center">
                  <span className="text-lg font-bold text-gray-700">{hour}</span>
                </div>
                
                {/* Coluna dos Agendamentos */}
                <div className="flex-grow p-4 space-y-4">
                  {hourlyApps.length > 0 ? (
                    hourlyApps.map((app) => {
                      const startTime = parseISO(app.start_time);
                      const endTime = parseISO(app.end_time);
                      const statusInfo = statusMap[app.status] || statusMap.pending;

                      return (
                        <Card 
                          key={app.id} 
                          className={cn(
                            "p-4 transition-all duration-200 hover:shadow-lg",
                            app.status === 'confirmed' && 'border-l-4 border-primary',
                            app.status === 'completed' && 'border-l-4 border-green-500',
                            app.status === 'pending' && 'border-l-4 border-yellow-500',
                            app.status === 'rejected' && 'border-l-4 border-red-500',
                            app.status === 'cancelled' && 'border-l-4 border-gray-400',
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
                                <DropdownMenuItem onClick={() => handleRescheduleClick(app)}>
                                  <Repeat className="h-4 w-4 mr-2" /> Remarcar
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
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">Livre para agendamento.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Modal de Remarcação */}
      {selectedAppointment && businessSchedule && (
        <RescheduleDialog
          open={isRescheduleModalOpen}
          onOpenChange={setIsRescheduleModalOpen}
          appointment={selectedAppointment}
          businessId={businessId!}
          businessWorkingHours={businessSchedule.working_hours}
          onSuccess={handleRescheduleSuccess}
        />
      )}
    </div>
  );
};

export default AppointmentsPage;