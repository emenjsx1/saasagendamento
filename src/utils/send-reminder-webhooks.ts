/**
 * Função utilitária para enviar webhooks de lembretes criados
 */

import { supabase } from '@/integrations/supabase/client';
import { sendReminderToN8N, prepareReminderPayload } from './reminder-webhook';

/**
 * Envia webhooks para lembretes recém-criados de um agendamento
 */
export async function sendWebhooksForAppointmentReminders(appointmentId: string): Promise<void> {
  try {
    // Buscar lembretes criados para este agendamento
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select(`
        *,
        clients!inner(name, whatsapp, phone, email),
        appointments!inner(
          id,
          start_time,
          services!inner(name)
        )
      `)
      .eq('appointment_id', appointmentId)
      .eq('reminder_type', 'appointment_auto')
      .eq('status', 'pending')
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar lembretes:', error);
      return;
    }

    if (!reminders || reminders.length === 0) {
      return;
    }

    // Enviar webhook para cada lembrete
    for (const reminder of reminders) {
      const client = Array.isArray(reminder.clients) ? reminder.clients[0] : reminder.clients;
      const appointment = Array.isArray(reminder.appointments) ? reminder.appointments[0] : reminder.appointments;
      const service = appointment?.services 
        ? (Array.isArray(appointment.services) ? appointment.services[0] : appointment.services)
        : null;

      if (!client) {
        console.warn('Cliente não encontrado para lembrete:', reminder.id);
        continue;
      }

      const payload = prepareReminderPayload(reminder, client);
      
      // Adicionar informações adicionais do agendamento
      payload.metadata = {
        ...payload.metadata,
        appointment_start: appointment?.start_time,
        service_name: service?.name,
        send_before_minutes: reminder.send_before_minutes,
      };

      try {
        const sent = await sendReminderToN8N(payload);
        
        if (sent) {
          // Marcar como enviado
          await supabase
            .from('reminders')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString() 
            })
            .eq('id', reminder.id);
          
          console.log('✅ Webhook enviado e lembrete marcado como enviado:', reminder.id);
        } else {
          console.warn('⚠️ Webhook não foi enviado com sucesso, mantendo como pending:', reminder.id);
        }
      } catch (webhookError) {
        console.error('❌ Erro ao enviar webhook para lembrete:', reminder.id, webhookError);
        // Manter como pending para tentar novamente depois
      }
    }
  } catch (error) {
    console.error('Erro ao processar webhooks de lembretes:', error);
  }
}


