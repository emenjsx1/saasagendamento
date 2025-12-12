import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReminders, Reminder } from '@/hooks/use-reminders';
import { useClients } from '@/hooks/use-clients';
import { useBusiness } from '@/hooks/use-business';
import { usePlanLimits } from '@/hooks/use-plan-limits';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const reminderSchema = z.object({
  reminder_type: z.enum(['appointment_auto', 'custom']),
  client_id: z.string().optional(),
  appointment_id: z.string().optional(),
  title: z.string().min(1, 'Título é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória'),
  send_via: z.enum(['whatsapp', 'sms', 'email']),
  scheduled_at: z.string().optional(),
  send_before_minutes: z.number().optional(),
}).refine((data) => {
  if (data.reminder_type === 'custom') {
    return !!data.client_id && !!data.scheduled_at;
  }
  return true;
}, {
  message: 'Cliente e data/hora são obrigatórios para lembretes personalizados',
  path: ['client_id'],
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

interface ReminderFormProps {
  reminder?: Reminder;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultAppointmentId?: string;
  defaultClientId?: string;
}

export function ReminderForm({ 
  reminder, 
  onSuccess, 
  onCancel,
  defaultAppointmentId,
  defaultClientId 
}: ReminderFormProps) {
  const { businessId } = useBusiness();
  const { T } = useCurrency();
  const { limits } = usePlanLimits();
  const { createReminder, updateReminder } = useReminders({ businessId: businessId || undefined });
  const { clients } = useClients({ businessId: businessId || undefined });

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      reminder_type: reminder?.reminder_type || (defaultAppointmentId ? 'appointment_auto' : 'custom'),
      client_id: reminder?.client_id || defaultClientId || '',
      appointment_id: reminder?.appointment_id || defaultAppointmentId || '',
      title: reminder?.title || '',
      message: reminder?.message || '',
      send_via: reminder?.send_via || 'whatsapp',
      scheduled_at: reminder?.scheduled_at 
        ? format(new Date(reminder.scheduled_at), "yyyy-MM-dd'T'HH:mm")
        : '',
      send_before_minutes: reminder?.send_before_minutes || undefined,
    },
  });

  const reminderType = form.watch('reminder_type');

  const onSubmit = async (values: ReminderFormValues) => {
    try {
      if (!businessId) {
        toast.error(T('Negócio não encontrado', 'Business not found'));
        return;
      }

      // Verificar limite de lembretes antes de criar (apenas para novos lembretes)
      if (!reminder && !limits.canCreateReminder) {
        toast.error(
          T(
            `Você atingiu o limite de ${limits.maxReminders} lembretes por mês do seu plano. Atualize para enviar mais lembretes.`,
            `You have reached the limit of ${limits.maxReminders} reminders per month for your plan. Upgrade to send more reminders.`
          ),
          { duration: 6000 }
        );
        return;
      }

      const reminderData = {
        business_id: businessId,
        client_id: values.client_id || null,
        appointment_id: values.appointment_id || null,
        reminder_type: values.reminder_type,
        title: values.title,
        message: values.message,
        send_via: values.send_via,
        send_before_minutes: values.send_before_minutes || null,
        scheduled_at: values.scheduled_at 
          ? new Date(values.scheduled_at).toISOString()
          : new Date().toISOString(),
        status: 'pending' as const,
        metadata: {},
      };

      if (reminder) {
        await updateReminder(reminder.id, reminderData);
        toast.success(T('Lembrete atualizado com sucesso!', 'Reminder updated successfully!'));
      } else {
        await createReminder(reminderData);
        toast.success(T('Lembrete criado com sucesso!', 'Reminder created successfully!'));
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving reminder:', error);
      toast.error(
        error.message || 
        T('Erro ao salvar lembrete', 'Error saving reminder')
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="reminder_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{T('Tipo de Lembrete', 'Reminder Type')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="custom">{T('Personalizado', 'Custom')}</SelectItem>
                  <SelectItem value="appointment_auto">{T('Automático (Agendamento)', 'Automatic (Appointment)')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {reminderType === 'custom' && (
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{T('Cliente', 'Client')} *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder={T('Selecione um cliente', 'Select a client')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{T('Título', 'Title')} *</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder={T('Ex: Lembrete de corte de cabelo', 'Ex: Haircut reminder')}
                  className="rounded-2xl"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{T('Mensagem', 'Message')} *</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder={T('Mensagem que será enviada ao cliente...', 'Message that will be sent to the client...')}
                  className="rounded-2xl min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {reminderType === 'custom' && (
          <FormField
            control={form.control}
            name="scheduled_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{T('Data e Hora', 'Date and Time')} *</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="datetime-local"
                    className="rounded-2xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {reminderType === 'appointment_auto' && (
          <FormField
            control={form.control}
            name="send_before_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{T('Enviar Antes (minutos)', 'Send Before (minutes)')}</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(Number(value))} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder={T('Selecione', 'Select')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="30">30 {T('minutos antes', 'minutes before')}</SelectItem>
                    <SelectItem value="60">1 {T('hora antes', 'hour before')}</SelectItem>
                    <SelectItem value="1440">1 {T('dia antes', 'day before')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex gap-4 justify-end pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="rounded-2xl"
            >
              {T('Cancelar', 'Cancel')}
            </Button>
          )}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="rounded-2xl"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {T('Salvando...', 'Saving...')}
              </>
            ) : (
              reminder ? T('Atualizar Lembrete', 'Update Reminder') : T('Criar Lembrete', 'Create Reminder')
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

