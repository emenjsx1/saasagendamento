import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, MoreHorizontal, CheckCircle, XCircle, Filter, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateFilter } from '@/components/DateFilter';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn, formatCurrency } from '@/lib/utils';

type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';

interface Appointment {
  id: string;
  client_name: string;
  client_whatsapp: string;
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
    if (!user) return;

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
    let query = supabase
      .from('appointments')
      .select(`
        id,
        client_name,
        client_whatsapp,
        start_time,
        end_time,
        status,
        services (name, duration_minutes, price)
      `)
      .eq('business_id', currentBusinessId);

    // Aplicar filtro de Status
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    // Aplicar filtro de Data (a partir de)
    if (filterDate) {
      const dateString = format(filterDate, 'yyyy-MM-dd HH:mm:ss');
      query = query.gte('start_time', dateString);
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

  const updateAppointmentStatus = async (id: string, newStatus: AppointmentStatus, servicePrice: number) => {
    const loadingToastId = toast.loading(`Atualizando status para ${statusMap[newStatus].label}...`);
    
    try {
      const updates: any = { status: newStatus };

      // Se o status for 'completed', registrar como receita
      if (newStatus === 'completed') {
        // Nota: Não estamos inserindo na tabela 'revenues' aqui, mas sim marcando o agendamento como concluído.
        // A receita será calculada na Dashboard/Financeiro buscando agendamentos concluídos.
        // Se quisermos registrar na tabela 'revenues', precisaríamos de uma lógica mais complexa de idempotência.
        // Por enquanto, vamos apenas atualizar o status e confiar no hook useAppointmentRevenue.
      }

      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id);

      if (error) {
        throw error;
      }

      setAppointments(prev => 
        prev.map(app => app.id === id ? { ...app, status: newStatus } : app)
      );
      toast.success(`Agendamento atualizado para ${statusMap[newStatus].label}.`, { id: loadingToastId });
      setRefreshKey(prev => prev + 1); // Força a atualização da dashboard/financeiro
      
    } catch (error: any) {
      toast.error(`Erro ao atualizar status: ${error.message}`, { id: loadingToastId });
      console.error(error);
    }
  };

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

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Agenda de Agendamentos</h1>
      
      {/* Filtros */}
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

        <div className="flex items-center space-x-2 ml-auto">
          <DateFilter date={filterDate} setDate={setFilterDate} />
          <Button variant="outline" size="icon" onClick={() => setFilterDate(undefined)} title="Limpar Filtro de Data">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agendamentos Encontrados ({appointments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum agendamento encontrado com os filtros atuais.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => {
                    const startTime = new Date(appointment.start_time);
                    const statusInfo = statusMap[appointment.status] || statusMap.pending;

                    return (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div className="font-medium">{appointment.client_name}</div>
                          <div className="text-sm text-muted-foreground">{appointment.client_whatsapp}</div>
                        </TableCell>
                        <TableCell>{appointment.services.name}</TableCell>
                        <TableCell>{format(startTime, 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                        <TableCell>{format(startTime, 'HH:mm', { locale: ptBR })}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(appointment.services.price)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Gerenciar</DropdownMenuLabel>
                              {appointment.status !== 'confirmed' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(appointment.id, 'confirmed', appointment.services.price)}>
                                  <CheckCircle className="h-4 w-4 mr-2" /> Confirmar
                                </DropdownMenuItem>
                              )}
                              {appointment.status !== 'completed' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(appointment.id, 'completed', appointment.services.price)}>
                                  Concluir (Registrar Receita)
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {appointment.status !== 'rejected' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(appointment.id, 'rejected', appointment.services.price)}>
                                  <XCircle className="h-4 w-4 mr-2" /> Rejeitar
                                </DropdownMenuItem>
                              )}
                              {appointment.status !== 'cancelled' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(appointment.id, 'cancelled', appointment.services.price)}>
                                  Cancelar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentsPage;