import React, { useState, useEffect } from 'react';
import { useReminders } from '@/hooks/use-reminders';
import { useBusiness } from '@/hooks/use-business';
import { usePlanLimits } from '@/hooks/use-plan-limits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Bell, Calendar, Clock, X, CheckCircle, AlertCircle, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReminderForm } from '@/components/ReminderForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClients } from '@/hooks/use-clients';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function RemindersPage() {
  const { businessId } = useBusiness();
  const { T } = useCurrency();
  const { limits, isLoading: isLimitsLoading } = usePlanLimits();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all'); // Mostrar todos por padrão
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { reminders, isLoading, error, refetch } = useReminders({
    businessId: businessId || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    reminderType: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const { clients } = useClients({ businessId: businessId || undefined });
  const [isCreatingRetroactive, setIsCreatingRetroactive] = useState(false);
  const [confirmedAppointments, setConfirmedAppointments] = useState<any[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  const createRetroactiveReminders = async () => {
    if (!businessId) {
      toast.error(T('Negócio não encontrado', 'Business not found'));
      return;
    }

    setIsCreatingRetroactive(true);
    try {
      const { data, error } = await supabase.rpc('create_retroactive_reminders', {
        p_business_id: businessId,
      });

      if (error) throw error;

      const totalCreated = data?.reduce((sum: number, item: any) => sum + (item.reminders_created || 0), 0) || 0;

      if (totalCreated > 0) {
        toast.success(
          T(
            `${totalCreated} lembrete(s) criado(s) com sucesso!`,
            `${totalCreated} reminder(s) created successfully!`
          )
        );
        // Atualizar a lista de lembretes
        await refetch();
      } else {
        toast.info(
          T(
            'Nenhum agendamento confirmado encontrado para criar lembretes',
            'No confirmed appointments found to create reminders'
          )
        );
      }
    } catch (error: any) {
      console.error('Erro ao criar lembretes retroativos:', error);
      toast.error(
        error.message || 
        T('Erro ao criar lembretes retroativos', 'Error creating retroactive reminders')
      );
    } finally {
      setIsCreatingRetroactive(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      sent: 'default',
      failed: 'destructive',
      cancelled: 'outline',
    };

    const labels: Record<string, string> = {
      pending: T('Pendente', 'Pending'),
      sent: T('Enviado', 'Sent'),
      failed: T('Falhou', 'Failed'),
      cancelled: T('Cancelado', 'Cancelled'),
    };

    return (
      <Badge variant={variants[status] || 'secondary'} className="rounded-full">
        {labels[status] || status}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    return type === 'appointment_auto' 
      ? T('Automático', 'Automatic')
      : T('Personalizado', 'Custom');
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return T('Cliente não encontrado', 'Client not found');
    const client = clients.find(c => c.id === clientId);
    return client?.name || T('Cliente não encontrado', 'Client not found');
  };

  // Buscar agendamentos confirmados futuros
  useEffect(() => {
    const fetchConfirmedAppointments = async () => {
      if (!businessId) return;

      setIsLoadingAppointments(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            client_name,
            client_email,
            client_whatsapp,
            start_time,
            services!inner(id, name, price)
          `)
          .eq('business_id', businessId)
          .eq('status', 'confirmed')
          .order('start_time', { ascending: true });

        if (error) throw error;

        // Verificar quais já têm lembretes
        if (data && data.length > 0) {
          const appointmentIds = data.map(a => a.id);
          const { data: existingReminders } = await supabase
            .from('reminders')
            .select('appointment_id')
            .in('appointment_id', appointmentIds)
            .eq('reminder_type', 'appointment_auto');

          const appointmentsWithReminders = new Set(
            existingReminders?.map(r => r.appointment_id) || []
          );

          // Adicionar flag se já tem lembrete
          const appointmentsWithFlag = data.map(apt => ({
            ...apt,
            has_reminder: appointmentsWithReminders.has(apt.id),
          }));

          setConfirmedAppointments(appointmentsWithFlag || []);
        } else {
          setConfirmedAppointments([]);
        }
      } catch (error: any) {
        console.error('Erro ao buscar agendamentos:', error);
      } finally {
        setIsLoadingAppointments(false);
      }
    };

    fetchConfirmedAppointments();
  }, [businessId, reminders]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600">
              {T('Erro ao carregar lembretes:', 'Error loading reminders:')} {error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{T('Lembretes', 'Reminders')}</h1>
          <p className="text-gray-500 mt-1">
            {reminders.length} {T('lembrete(s)', 'reminder(s)')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={async () => {
              // Testar webhook via Edge Function
              if (!businessId) {
                toast.error(T('Negócio não encontrado', 'Business not found'));
                return;
              }

              const testPayload = {
                reminder_id: 'test-' + Date.now(),
                business_id: businessId,
                client_id: null,
                appointment_id: null,
                client_name: 'Cliente Teste',
                client_whatsapp: '841234567',
                client_phone: '841234567',
                client_email: 'teste@email.com',
                reminder_type: 'custom',
                title: 'Teste de Lembrete',
                message: 'Esta é uma mensagem de teste do sistema de lembretes.',
                send_via: 'whatsapp',
                scheduled_at: new Date().toISOString(),
                metadata: {},
              };

              const loadingToast = toast.loading(T('Enviando teste...', 'Sending test...'));
              try {
                const { data, error } = await supabase.functions.invoke('process-reminders', {
                  body: { 
                    action: 'send_single',
                    payload: testPayload 
                  },
                });

                toast.dismiss(loadingToast);
                if (error) {
                  console.error('Erro:', error);
                  toast.error(T('❌ Erro ao enviar teste', '❌ Error sending test') + ': ' + error.message);
                } else if (data?.success) {
                  toast.success(T('✅ Teste enviado com sucesso!', '✅ Test sent successfully!'));
                } else {
                  toast.error(T('❌ Erro ao enviar teste', '❌ Error sending test'));
                }
              } catch (error: any) {
                toast.dismiss(loadingToast);
                console.error('Erro:', error);
                toast.error(T('❌ Erro ao enviar teste', '❌ Error sending test') + ': ' + error.message);
              }
            }}
            variant="outline"
            className="rounded-2xl"
          >
            <Bell className="h-4 w-4 mr-2" />
            {T('Testar Webhook', 'Test Webhook')}
          </Button>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-2xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            {T('Novo Lembrete', 'New Reminder')}
          </Button>
        </div>
      </div>

      {/* Agendamentos Confirmados */}
      {confirmedAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{T('Agendamentos Confirmados', 'Confirmed Appointments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {confirmedAppointments.map((apt) => {
                const service = Array.isArray(apt.services) ? apt.services[0] : apt.services;
                const hasReminder = apt.has_reminder;

                return (
                  <div
                    key={apt.id}
                    className="p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{apt.client_name}</h4>
                          {hasReminder && (
                            <Badge variant="outline" className="rounded-full text-xs">
                              {T('Já tem lembrete', 'Has reminder')}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(parseISO(apt.start_time), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                          {service && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{service.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const loadingToast = toast.loading(T('Enviando lembrete...', 'Sending reminder...'));
                          try {
                            const { sendAppointmentReminder } = await import('@/utils/send-appointment-reminder');
                            const sent = await sendAppointmentReminder(apt, businessId!);
                            toast.dismiss(loadingToast);
                            if (sent) {
                              toast.success(T('✅ Lembrete enviado com sucesso!', '✅ Reminder sent successfully!'));
                              await refetch();
                              // Recarregar agendamentos
                              const { data } = await supabase
                                .from('appointments')
                                .select(`
                                  id,
                                  client_name,
                                  client_email,
                                  client_whatsapp,
                                  start_time,
                                  services!inner(id, name, price)
                                `)
                                .eq('business_id', businessId)
                                .eq('status', 'confirmed')
                                .order('start_time', { ascending: true });

                              if (data && data.length > 0) {
                                const appointmentIds = data.map(a => a.id);
                                const { data: existingReminders } = await supabase
                                  .from('reminders')
                                  .select('appointment_id')
                                  .in('appointment_id', appointmentIds)
                                  .eq('reminder_type', 'appointment_auto');

                                const appointmentsWithReminders = new Set(
                                  existingReminders?.map(r => r.appointment_id) || []
                                );

                                const appointmentsWithFlag = data.map(apt => ({
                                  ...apt,
                                  has_reminder: appointmentsWithReminders.has(apt.id),
                                }));

                                setConfirmedAppointments(appointmentsWithFlag || []);
                              }
                            } else {
                              toast.error(T('❌ Erro ao enviar lembrete', '❌ Error sending reminder'));
                            }
                          } catch (error: any) {
                            toast.dismiss(loadingToast);
                            console.error('Erro ao enviar lembrete:', error);
                            toast.error(error.message || T('Erro ao enviar lembrete', 'Error sending reminder'));
                          }
                        }}
                        size="sm"
                        className="rounded-2xl"
                        variant={hasReminder ? "outline" : "default"}
                        disabled={hasReminder}
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        {hasReminder ? T('Já Enviado', 'Already Sent') : T('Enviar Lembrete', 'Send Reminder')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>{T('Filtros', 'Filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className="rounded-2xl"
              >
                {T('Todos', 'All')}
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('pending')}
                className="rounded-2xl"
              >
                {T('Pendentes', 'Pending')}
              </Button>
              <Button
                variant={statusFilter === 'sent' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('sent')}
                className="rounded-2xl"
              >
                {T('Enviados', 'Sent')}
              </Button>
              <Button
                variant={statusFilter === 'failed' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('failed')}
                className="rounded-2xl"
              >
                {T('Falhados', 'Failed')}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setTypeFilter('all')}
                className="rounded-2xl"
              >
                {T('Todos os Tipos', 'All Types')}
              </Button>
              <Button
                variant={typeFilter === 'appointment_auto' ? 'default' : 'outline'}
                onClick={() => setTypeFilter('appointment_auto')}
                className="rounded-2xl"
              >
                {T('Automáticos', 'Automatic')}
              </Button>
              <Button
                variant={typeFilter === 'custom' ? 'default' : 'outline'}
                onClick={() => setTypeFilter('custom')}
                className="rounded-2xl"
              >
                {T('Personalizados', 'Custom')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Lembretes */}
      <Card>
        <CardContent className="p-0">
          {reminders.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">
                {T('Nenhum lembrete encontrado', 'No reminders found')}
              </p>
              <p className="text-gray-400 text-sm mb-6">
                {T('Crie lembretes personalizados ou aguarde lembretes automáticos de agendamentos', 'Create custom reminders or wait for automatic appointment reminders')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="rounded-2xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {T('Criar Primeiro Lembrete', 'Create First Reminder')}
                </Button>
                <Button 
                  onClick={createRetroactiveReminders}
                  disabled={isCreatingRetroactive}
                  variant="outline"
                  className="rounded-2xl"
                >
                  {isCreatingRetroactive ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {T('Criando...', 'Creating...')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {T('Criar Lembretes para Agendamentos Confirmados', 'Create Reminders for Confirmed Appointments')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Bell className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">{reminder.title}</h3>
                        {getStatusBadge(reminder.status)}
                        <Badge variant="outline" className="rounded-full">
                          {getTypeLabel(reminder.reminder_type)}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{reminder.message}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        {reminder.client_id && (
                          <div className="flex items-center gap-1">
                            <span>{T('Cliente:', 'Client:')}</span>
                            <span className="font-medium">{getClientName(reminder.client_id)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(reminder.scheduled_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        {reminder.send_before_minutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {reminder.send_before_minutes === 1440 
                                ? T('1 dia antes', '1 day before')
                                : reminder.send_before_minutes === 60
                                ? T('1 hora antes', '1 hour before')
                                : `${reminder.send_before_minutes} ${T('min antes', 'min before')}`
                              }
                            </span>
                          </div>
                        )}
                        {reminder.sent_at && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                            <span>
                              {T('Enviado em', 'Sent at')} {format(new Date(reminder.sent_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criar Lembrete */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{T('Novo Lembrete', 'New Reminder')}</DialogTitle>
          </DialogHeader>
          <ReminderForm
            onSuccess={async () => {
              setIsCreateModalOpen(false);
              // Atualizar lista sem recarregar página
              await refetch();
            }}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

