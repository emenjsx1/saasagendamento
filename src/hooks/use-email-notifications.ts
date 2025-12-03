import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackMessageUsage } from '@/utils/message-usage-tracking';

// URL da Edge Function (Substitua ihozrsfnfmwmrkbzpqlj pelo seu Project ID)
const RESEND_FUNCTION_URL = 'https://ihozrsfnfmwmrkbzpqlj.supabase.co/functions/v1/send-email';

interface EmailPayload {
  to: string;
  subject: string;
  body: string; // HTML content
}

export const useEmailNotifications = () => {
  
  const sendEmail = async (payload: EmailPayload, userId?: string) => {
    try {
      // Validar payload
      if (!payload.to || !payload.subject || !payload.body) {
        const missingFields = [];
        if (!payload.to) missingFields.push('to');
        if (!payload.subject) missingFields.push('subject');
        if (!payload.body) missingFields.push('body');
        throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
      }

      // O token de autenticação é necessário para chamar Edge Functions
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn("⚠️ Não é possível enviar email: sessão do usuário não encontrada.");
        throw new Error("Sessão do usuário não encontrada. Por favor, faça login novamente.");
      }

      console.log('📧 Enviando email:', { 
        to: payload.to, 
        subject: payload.subject,
        bodyLength: payload.body.length 
      });

      const response = await fetch(RESEND_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      // Tentar parsear resposta mesmo se não for OK para obter detalhes do erro
      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }

      if (!response.ok) {
        const errorMessage = responseData.error || `Falha ao enviar email: ${response.status} ${response.statusText}`;
        console.error('❌ Erro ao enviar email:', {
          status: response.status,
          error: errorMessage,
          details: responseData.details
        });
        throw new Error(errorMessage);
      }

      console.log("✅ Email enviado com sucesso:", responseData);
      
      // Rastrear uso de email após envio bem-sucedido
      const emailUserId = userId || session.user.id;
      if (emailUserId) {
        try {
          await trackMessageUsage(emailUserId, 'email');
        } catch (trackError) {
          console.warn('⚠️ Erro ao rastrear uso de email (não crítico):', trackError);
        }
      }

      return { success: true, data: responseData };

    } catch (error: any) {
      console.error("❌ Erro ao enviar notificação por email:", {
        message: error.message,
        stack: error.stack,
        payload: { to: payload.to, subject: payload.subject }
      });
      
      // Re-throw para que o chamador possa tratar o erro se necessário
      throw error;
    }
  };

  return { sendEmail };
};