import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Loader2, Search, CheckCircle, XCircle, MoreHorizontal, Briefcase, Clock, User, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/utils';

type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';

interface Appointment {
  id: string;
  client_name: string;
  client_code: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  services: { name: string; price: number; duration_minutes: number } | null;
  businesses: { name: string; slug: string } | null;
}

const statusMap: Record<AppointmentStatus, { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success', color: string }> = {
  pending: { label: 'Pendente', variant: 'secondary', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  confirmed: { label: 'Confirmado', variant: 'default', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  rejected: { label: 'Rejeitado', variant: 'destructive', color: 'bg-red-100 text-red-700 border-red-300' },
  completed: { label: 'Concluído', variant: 'success', color: 'bg-green-100 text-green-700 border-green-300' },
  cancelled: { label: 'Cancelado', variant: 'outline', color: 'bg-gray-100 text-gray-700 border-gray-300' },
};

const AdminAppointmentsPage: React.FC = () => {
  const { T, currentCurrency } = useCurrency();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);

    try {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          client_name,
          client_code,
          start_time,
          end_time,
          status,
          services (name, price, duration_minutes),
          businesses (name, slug)
        `);

      // Aplicar filtro de Status
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      // Aplicar filtro de busca (por nome do cliente ou código)
      if (searchTerm) {
        query = query.or(`client_name.ilike.%${searchTerm}%,client_code.ilike.%${searchTerm}%`);
      }

      // Ordenar por data de início
      query = query.order('start_time', { ascending: false });

      const { data: appointmentsData, error: appointmentsError } = await query;

      if (appointmentsError) {
        toast.error(T("Erro ao carregar agendamentos.", "Error loading appointments."));
        console.error(appointmentsError);
        setAppointments([]);
      } else {
        // Mapear os dados para garantir que os objetos aninhados estejam no formato correto
        const mappedAppointments = (appointmentsData || []).map(app => ({
          ...app,
          services: Array.isArray(app.services) ? app.services[0] : app.services,
          businesses: Array.isArray(app.businesses) ? app.businesses[0] : app.businesses,
        })) as Appointment[];
        
        setAppointments(mappedAppointments);
      }
    } catch (error: any) {
      console.error('Erro ao buscar agendamentos:', error);
      toast.error(T("Erro ao carregar agendamentos.", "Error loading appointments."));
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, searchTerm, refreshKey, T]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const updateAppointmentStatus = async (app: Appointment, newStatus: AppointmentStatus) => {
    const loadingToastId = toast.loading(T(`Atualizando status para ${statusMap[newStatus].label}...`, `Updating status to ${statusMap[newStatus].label}...`));
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', app.id);

      if (error) throw error;

      // Força a atualização da lista
      setRefreshKey(prev => prev + 1); 
      toast.success(T(`Agendamento atualizado para ${statusMap[newStatus].label}.`, `Appointment updated to ${statusMap[newStatus].label}.`), { id: loadingToastId });
      
    } catch (error: any) {
      toast.error(T(`Erro ao atualizar status: ${error.message}`, `Error updating status: ${error.message}`), { id: loadingToastId });
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Calendar className="h-7 w-7 text-white" />
            </div>
            {T('Controle de Agendamentos', 'Appointment Control')}
          </h1>
          <p className="text-gray-600 mt-2">{T('Monitore e gerencie todos os agendamentos da plataforma', 'Monitor and manage all platform appointments')}</p>
        </div>
      </div>
      
      {/* Filters and Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{T('Monitoramento de Agendamentos', 'Appointment Monitoring')} ({appointments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mb-6">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={T("Buscar por nome do cliente ou código...", "Search by client name or code...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <ToggleGroup 
                type="single" 
                value={filterStatus} 
                onValueChange={(value: AppointmentStatus | 'all') => {
                  if (value) setFilterStatus(value);
                }}
                className="flex flex-wrap justify-start"
              >
                <ToggleGroupItem value="all" aria-label={T('Todos', 'All')} className="h-9 text-xs">
                  {T('Todos', 'All')}
                </ToggleGroupItem>
                <ToggleGroupItem value="pending" aria-label={T('Pendente', 'Pending')} className="h-9 text-xs">
                  {T('Pendente', 'Pending')}
                </ToggleGroupItem>
                <ToggleGroupItem value="confirmed" aria-label={T('Confirmado', 'Confirmed')} className="h-9 text-xs">
                  {T('Confirmado', 'Confirmed')}
                </ToggleGroupItem>
                <ToggleGroupItem value="completed" aria-label={T('Concluído', 'Completed')} className="h-9 text-xs">
                  {T('Concluído', 'Completed')}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{T('Nenhum agendamento encontrado com os filtros selecionados.', 'No appointments found with selected filters.')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{T('Cliente', 'Client')}</TableHead>
                    <TableHead>{T('Negócio', 'Business')}</TableHead>
                    <TableHead>{T('Serviço', 'Service')}</TableHead>
                    <TableHead>{T('Data/Hora', 'Date/Time')}</TableHead>
                    <TableHead>{T('Valor', 'Amount')}</TableHead>
                    <TableHead>{T('Status', 'Status')}</TableHead>
                    <TableHead className="text-right">{T('Ações', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((app) => {
                    const statusInfo = statusMap[app.status] || statusMap.pending;
                    const startTime = parseISO(app.start_time);
                    const endTime = parseISO(app.end_time);

                    return (
                      <TableRow key={app.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              {app.client_name}
                            </p>
                            {app.client_code && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <Tag className="h-3 w-3" /> {app.client_code}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Briefcase className="h-4 w-4 text-gray-400" />
                            {app.businesses?.name || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{app.services?.name || 'N/A'}</p>
                            {app.services?.duration_minutes && (
                              <p className="text-xs text-gray-500">{app.services.duration_minutes} {T('min', 'min')}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{format(startTime, 'dd/MM/yyyy', { locale: ptBR })}</p>
                              <p className="text-xs text-gray-500">{format(startTime, 'HH:mm', { locale: ptBR })} - {format(endTime, 'HH:mm', { locale: ptBR })}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {app.services?.price ? formatCurrency(app.services.price, currentCurrency.key, currentCurrency.locale) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">{T('Abrir menu', 'Open menu')}</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{T('Ações Administrativas', 'Administrative Actions')}</DropdownMenuLabel>
                              {app.status !== 'confirmed' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(app, 'confirmed')}>
                                  <CheckCircle className="h-4 w-4 mr-2" /> {T('Confirmar', 'Confirm')}
                                </DropdownMenuItem>
                              )}
                              {app.status !== 'rejected' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(app, 'rejected')}>
                                  <XCircle className="h-4 w-4 mr-2" /> {T('Rejeitar', 'Reject')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {app.status !== 'cancelled' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(app, 'cancelled')}>
                                  {T('Cancelar', 'Cancel')}
                                </DropdownMenuItem>
                              )}
                              {app.status !== 'completed' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(app, 'completed')}>
                                  {T('Marcar como Concluído', 'Mark as Completed')}
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
