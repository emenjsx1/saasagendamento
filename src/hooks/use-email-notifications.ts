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
      // O token de autenticação é necessário para chamar Edge Functions
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn("Cannot send email: User session not found.");
        return;
      }

      const response = await fetch(RESEND_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email via Edge Function');
      }

      console.log("Email notification sent successfully.");
      
      // Rastrear uso de email após envio bem-sucedido
      const emailUserId = userId || session.user.id;
      if (emailUserId) {
        await trackMessageUsage(emailUserId, 'email');
      }
      // Não mostramos toast de sucesso para o usuário final, apenas logamos.

    } catch (error: any) {
      console.error("Error sending email notification:", error.message);
      // toast.error("Falha ao enviar notificação por e-mail."); // Opcional: notificar o admin
    }
  };

  return { sendEmail };
};