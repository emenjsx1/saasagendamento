import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendWebhooksForAppointmentReminders } from '@/utils/send-reminder-webhooks';

export interface Reminder {
  id: string;
  business_id: string;
  client_id: string | null;
  appointment_id: string | null;
  reminder_type: 'appointment_auto' | 'custom';
  title: string;
  message: string;
  send_via: 'whatsapp' | 'sms' | 'email';
  send_before_minutes: number | null;
  scheduled_at: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface UseRemindersOptions {
  businessId?: string;
  clientId?: string;
  appointmentId?: string;
  status?: string;
  reminderType?: string;
}

export function useReminders(options: UseRemindersOptions = {}) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReminders = useCallback(async () => {
    if (!options.businessId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('reminders')
        .select('*')
        .eq('business_id', options.businessId!)
        .order('scheduled_at', { ascending: true });

      if (options.clientId) {
        query = query.eq('client_id', options.clientId);
      }

      if (options.appointmentId) {
        query = query.eq('appointment_id', options.appointmentId);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.reminderType) {
        query = query.eq('reminder_type', options.reminderType);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('❌ Erro ao buscar lembretes:', queryError);
        throw queryError;
      }

      console.log('📋 Lembretes encontrados:', data?.length || 0, 'com filtros:', {
        businessId: options.businessId,
        status: options.status,
        reminderType: options.reminderType,
      });
      console.log('📋 Dados dos lembretes:', data);

      setReminders(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching reminders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options.businessId, options.clientId, options.appointmentId, options.status, options.reminderType]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const createReminder = async (reminderData: Omit<Reminder, 'id' | 'created_at' | 'updated_at' | 'sent_at'>) => {
    const { data, error } = await supabase
      .from('reminders')
      .insert(reminderData)
      .select()
      .single();

    if (error) throw error;

    // Enviar webhook imediatamente se for lembrete personalizado
    if (data && data.reminder_type === 'custom' && data.client_id) {
      try {
        // Buscar dados do cliente
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('name, whatsapp, phone, email')
          .eq('id', data.client_id)
          .single();

        if (!clientError && client) {
          const { sendReminderToN8N, prepareReminderPayload } = await import('@/utils/reminder-webhook');
          const payload = prepareReminderPayload(data, client);
          
          console.log('📤 Enviando webhook para lembrete personalizado:', data.id);
          const sent = await sendReminderToN8N(payload);
          
          if (sent) {
            // Marcar como enviado
            await supabase
              .from('reminders')
              .update({ 
                status: 'sent', 
                sent_at: new Date().toISOString() 
              })
              .eq('id', data.id);
            
            console.log('✅ Webhook enviado para lembrete personalizado:', data.id);
          } else {
            console.warn('⚠️ Webhook não foi enviado com sucesso, mantendo como pending:', data.id);
          }
        } else {
          console.warn('⚠️ Cliente não encontrado para lembrete:', data.id);
        }
      } catch (webhookError) {
        console.error('❌ Erro ao enviar webhook para lembrete personalizado:', webhookError);
        // Manter como pending para tentar novamente depois
      }
    }

    return data;
  };

  const createAppointmentReminders = async (
    appointmentId: string,
    businessId: string,
    clientId: string,
    appointmentStartTime: string
  ) => {
    // Usar a função do banco de dados
    const { data, error } = await supabase.rpc('create_appointment_reminders', {
      p_appointment_id: appointmentId,
      p_business_id: businessId,
      p_client_id: clientId,
      p_appointment_start_time: appointmentStartTime,
    });

    if (error) throw error;

    // Enviar webhooks imediatamente para os lembretes criados
    if (data && data > 0) {
      // Aguardar um pouco para garantir que os lembretes foram criados no banco
      setTimeout(async () => {
        await sendWebhooksForAppointmentReminders(appointmentId);
      }, 500);
    }

    return data;
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    const { data, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  const cancelReminder = async (id: string) => {
    return updateReminder(id, { status: 'cancelled' });
  };

  const markAsSent = async (id: string) => {
    return updateReminder(id, { 
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  };

  const cancelAppointmentReminders = async (appointmentId: string) => {
    const { data, error } = await supabase.rpc('cancel_appointment_reminders', {
      p_appointment_id: appointmentId,
    });

    if (error) throw error;
    return data;
  };

  return {
    reminders,
    isLoading,
    error,
    refetch: fetchReminders,
    createReminder,
    createAppointmentReminders,
    updateReminder,
    deleteReminder,
    cancelReminder,
    markAsSent,
    cancelAppointmentReminders,
  };
}

