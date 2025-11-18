import React, { useState, useEffect } from 'react';
import { Loader2, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
  client_name: string;
  client_whatsapp: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
  services: {
    name: string;
    duration_minutes: number;
  };
}

const statusMap: Record<Appointment['status'], { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
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

  useEffect(() => {
    if (!user) return;

    const fetchAppointments = async () => {
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

      // 2. Buscar Agendamentos
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          client_name,
          client_whatsapp,
          start_time,
          end_time,
          status,
          services (name, duration_minutes)
        `)
        .eq('business_id', currentBusinessId)
        .order('start_time', { ascending: false });

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
    };

    fetchAppointments();
  }, [user]);

  const updateAppointmentStatus = async (id: string, newStatus: Appointment['status']) => {
    // 1. Atualizar status no DB
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast.error(`Erro ao atualizar status: ${error.message}`);
      console.error(error);
      return;
    }

    // 2. Chamar Edge Function para notificação (apenas para Confirmed ou Rejected)
    if (newStatus === 'confirmed' || newStatus === 'rejected') {
      try {
        // Nota: O nome da função é 'notify-appointment'
        const { data, error: fnError } = await supabase.functions.invoke('notify-appointment', {
          body: { appointmentId: id, newStatus },
        });

        if (fnError) {
          console.error("Erro ao chamar Edge Function:", fnError);
          toast.warning("Status atualizado, mas houve um erro ao enviar a notificação.");
        } else {
          console.log("Notificação enviada (simulada):", data);
        }
      } catch (e) {
        console.error("Erro de rede ao chamar Edge Function:", e);
        toast.warning("Status atualizado, mas houve um erro de rede ao tentar notificar o cliente.");
      }
    }

    // 3. Atualizar estado local e mostrar sucesso
    setAppointments(prev => 
      prev.map(app => app.id === id ? { ...app, status: newStatus } : app)
    );
    toast.success(`Agendamento atualizado para ${statusMap[newStatus].label}.`);
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
      <Card>
        <CardHeader>
          <CardTitle>Próximos Agendamentos ({appointments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum agendamento encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Hora</TableHead>
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
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}>
                                  <CheckCircle className="h-4 w-4 mr-2" /> Confirmar
                                </DropdownMenuItem>
                              )}
                              {appointment.status !== 'rejected' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(appointment.id, 'rejected')}>
                                  <XCircle className="h-4 w-4 mr-2" /> Rejeitar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {appointment.status !== 'completed' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(appointment.id, 'completed')}>
                                  Concluir
                                </DropdownMenuItem>
                              )}
                              {appointment.status !== 'cancelled' && (
                                <DropdownMenuItem onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}>
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