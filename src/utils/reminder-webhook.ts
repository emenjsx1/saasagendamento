/**
 * Utilitários para envio de lembretes via webhook para n8n
 */

export interface ReminderWebhookPayload {
  reminder_id: string;
  business_id: string;
  client_id: string | null;
  appointment_id: string | null;
  client_name: string;
  client_whatsapp: string | null;
  client_phone: string | null;
  client_email: string | null;
  reminder_type: 'appointment_auto' | 'custom';
  title: string;
  message: string;
  send_via: 'whatsapp' | 'sms' | 'email';
  scheduled_at: string;
  metadata?: Record<string, any>;
}

/**
 * Envia lembrete para n8n via webhook
 */
export async function sendReminderToN8N(payload: ReminderWebhookPayload): Promise<boolean> {
  const WEBHOOK_URL = 'https://n8n.ejss.space/webhook-test/lembrete';

  console.log('📤 [WEBHOOK] Enviando lembrete para:', WEBHOOK_URL);
  console.log('📦 [WEBHOOK] Payload:', JSON.stringify(payload, null, 2));

  try {
    // Usar modo 'no-cors' apenas como fallback se houver problema de CORS
    // Mas primeiro tentar com CORS normal
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      mode: 'cors', // Explicitamente usar CORS
      credentials: 'omit', // Não enviar cookies
    });

    console.log('📥 [WEBHOOK] Resposta recebida:', response.status, response.statusText);

    if (response.ok) {
      const responseText = await response.text();
      console.log('✅ [WEBHOOK] Lembrete enviado para n8n com sucesso:', payload.reminder_id);
      console.log('📄 [WEBHOOK] Resposta do servidor:', responseText);
      return true;
    } else {
      const errorText = await response.text();
      console.warn('⚠️ [WEBHOOK] n8n retornou status não-OK:', response.status, response.statusText);
      console.warn('⚠️ [WEBHOOK] Erro:', errorText);
      return false;
    }
  } catch (error: any) {
    console.error('❌ [WEBHOOK] Erro ao enviar lembrete para n8n:', error);
    console.error('❌ [WEBHOOK] Detalhes do erro:', error.message, error.stack);
    return false;
  }
}

/**
 * Prepara payload do lembrete para envio
 */
export function prepareReminderPayload(
  reminder: {
    id: string;
    business_id: string;
    client_id: string | null;
    appointment_id: string | null;
    reminder_type: 'appointment_auto' | 'custom';
    title: string;
    message: string;
    send_via: 'whatsapp' | 'sms' | 'email';
    scheduled_at: string;
    metadata?: Record<string, any>;
  },
  client: {
    name: string;
    whatsapp?: string | null;
    phone?: string | null;
    email?: string | null;
  }
): ReminderWebhookPayload {
  return {
    reminder_id: reminder.id,
    business_id: reminder.business_id,
    client_id: reminder.client_id,
    appointment_id: reminder.appointment_id,
    client_name: client.name,
    client_whatsapp: client.whatsapp || null,
    client_phone: client.phone || null,
    client_email: client.email || null,
    reminder_type: reminder.reminder_type,
    title: reminder.title,
    message: reminder.message,
    send_via: reminder.send_via,
    scheduled_at: reminder.scheduled_at,
    metadata: reminder.metadata || {},
  };
}

