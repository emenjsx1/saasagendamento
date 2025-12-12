/**
 * Função para enviar lembrete diretamente de um agendamento confirmado
 */

import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function sendAppointmentReminder(
  appointment: {
    id: string;
    client_name: string;
    client_email?: string | null;
    client_whatsapp?: string | null;
    start_time: string;
    services?: { name: string } | null;
  },
  businessId: string
): Promise<boolean> {
  try {
    // Buscar ou criar cliente
    let clientId: string | null = null;
    let clientData: any = null;

    // Tentar encontrar cliente existente
    if (appointment.client_email) {
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('business_id', businessId)
        .eq('email', appointment.client_email)
        .single();
      if (client) {
        clientId = client.id;
        clientData = client;
      }
    }

    if (!clientId && appointment.client_whatsapp) {
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('business_id', businessId)
        .eq('whatsapp', appointment.client_whatsapp)
        .single();
      if (client) {
        clientId = client.id;
        clientData = client;
      }
    }

    // Se não encontrou, criar cliente
    if (!clientId) {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          business_id: businessId,
          name: appointment.client_name,
          email: appointment.client_email || null,
          whatsapp: appointment.client_whatsapp || null,
          phone: appointment.client_whatsapp || null,
        })
        .select()
        .single();

      if (clientError) {
        console.error('Erro ao criar cliente:', clientError);
        return false;
      }
      clientId = newClient?.id || null;
      clientData = newClient;
    }

    if (!clientId || !clientData) {
      console.error('Não foi possível criar/encontrar cliente');
      return false;
    }

    // Buscar informações do negócio
    const { data: businessData } = await supabase
      .from('businesses')
      .select('name, phone')
      .eq('id', businessId)
      .single();

    const service = Array.isArray(appointment.services) 
      ? appointment.services[0] 
      : appointment.services;

    // Criar mensagem do lembrete
    const appointmentDate = format(new Date(appointment.start_time), 'dd/MM/yyyy às HH:mm', { locale: ptBR });
    const reminderMessage = `🔔 *Lembrete de Agendamento*\n\n` +
      `Olá ${appointment.client_name}! Este é um lembrete do seu agendamento.\n\n` +
      `📅 *Data e Hora:* ${appointmentDate}\n` +
      `💼 *Serviço:* ${service?.name || 'Serviço'}\n` +
      `🏢 *Estabelecimento:* ${businessData?.name || 'Estabelecimento'}\n\n` +
      `Por favor, confirme sua presença ou entre em contato caso precise reagendar.\n\n` +
      `Obrigado!`;

    // Preparar payload do webhook
    const payload = {
      reminder_id: 'manual-' + appointment.id + '-' + Date.now(),
      business_id: businessId,
      client_id: clientId,
      appointment_id: appointment.id,
      client_name: appointment.client_name,
      client_whatsapp: appointment.client_whatsapp || null,
      client_phone: appointment.client_whatsapp || null,
      client_email: appointment.client_email || null,
      reminder_type: 'appointment_auto',
      title: 'Lembrete de Agendamento',
      message: reminderMessage,
      send_via: 'whatsapp',
      scheduled_at: new Date().toISOString(),
      metadata: {
        appointment_start: appointment.start_time,
        service_name: service?.name,
        business_name: businessData?.name,
        business_phone: businessData?.phone,
      },
    };

    // Enviar via process-reminders (que já existe e está deployada)
    // Esta função aceita action: 'send_single' para enviar um payload direto
    try {
      const { data, error } = await supabase.functions.invoke('process-reminders', {
        body: { 
          action: 'send_single',
          payload 
        },
      });

      if (!error && data?.success) {
        console.log('✅ Webhook enviado via process-reminders');
        return true;
      } else {
        console.error('❌ Erro ao enviar via process-reminders:', error);
        return false;
      }
    } catch (err: any) {
      console.error('❌ Erro ao chamar process-reminders:', err);
      return false;
    }
  } catch (error: any) {
    console.error('Erro ao enviar lembrete:', error);
    return false;
  }
}

