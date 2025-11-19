import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Loader2, Search, Filter, CheckCircle, XCircle, MoreHorizontal, Briefcase, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';

interface Appointment {
  id: string;
  client_name: string;
  start_time: string;
  status: AppointmentStatus;
  services: { name: string } | null;
  businesses: { name: string } | null;
}

const statusMap: Record<AppointmentStatus, { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
  completed: { label: 'Concluído', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
};

const AdminAppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);

    let query = supabase
      .from('appointments')
      .select(`
        id,
        client_name,
        start_time,
        status,
        services (name),
        businesses (name)
      `);

    // Aplicar filtro de Status
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }
    
    // Aplicar filtro de busca (por nome do cliente)
    if (searchTerm) {
        query = query.ilike('client_name', `%${searchTerm}%`);
    }

    // Ordenar por data de início
    query = query.order('start_time', { ascending: false });

    const { data: appointmentsData, error: appointmentsError } = await query;

    if (appointmentsError) {
      toast.error("Erro ao carregar agendamentos.");
      console.error(appointmentsError);
    } else {
      // Mapear os dados para garantir que os objetos aninhados estejam no formato correto
      const mappedAppointments = appointmentsData.map(app => ({
          ...app,
          services: Array.isArray(app.services) ? app.services[0] : app.services,
          businesses: Array.isArray(app.businesses) ? app.businesses[0] : app.businesses,
      })) as Appointment[];
      
      setAppointments(mappedAppointments);
    }
    setIsLoading(false);
  }, [filterStatus, searchTerm, refreshKey]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const updateAppointmentStatus = async (app: Appointment, newStatus: AppointmentStatus) => {
    const loadingToastId = toast.loading(`Atualizando status para ${statusMap[newStatus].label}...`);
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', app.id);

      if (error) throw error;

      // Força a atualização da lista
      setRefreshKey(prev => prev + 1); 
      toast.success(`Agendamento atualizado para ${statusMap[newStatus].label}.`, { id: loadingToastId });
      
    } catch (error: any) {
      toast.error(`Erro ao atualizar status: ${error.message}`, { id: loadingToastId });
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center text-red-600">
        <Calendar className="h-7 w-7 mr-3" />
        Controle de Agendamentos (Global)
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Monitoramento de Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
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
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
          ) : appointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum agendamento encontrado com os filtros selecionados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Negócio</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((app) => {
                    const statusInfo = statusMap[app.status] || statusMap.pending;
                    const startTime = parseISO(app.start_time);

                    return (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            {app.client_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center">
                                <Briefcase className="h-3 w-3 mr-1" /> {app.businesses?.name || 'N/A'}
                            </div>
                        </TableCell>
                        <TableCell className="text-sm">{app.services?.name || 'N/A'}</TableCell>
                        <TableCell>
                            <div className="flex items-center text-sm">
                                <Clock className="h-3 w-3 mr-1" />
                                {format(startTime, 'dd/MM/yy HH:mm', { locale: ptBR })}
                            </div>
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
                              <DropdownMenuLabel>Ações Administrativas</DropdownMenuLabel>
                              {app.status !== 'confirmed' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(app, 'confirmed')}>
                                  <CheckCircle className="h-4 w-4 mr-2" /> Confirmar
                                </DropdownMenuItem>
                              )}
                              {app.status !== 'rejected' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(app, 'rejected')}>
                                  <XCircle className="h-4 w-4 mr-2" /> Rejeitar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {app.status !== 'cancelled' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(app, 'cancelled')}>
                                  Cancelar
                                </DropdownMenuItem>
                              )}
                              {app.status !== 'completed' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(app, 'completed')}>
                                  Marcar como Concluído
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

export default AdminAppointmentsPage;