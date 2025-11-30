import { supabase } from '@/integrations/supabase/client';

/**
 * Rastreia o uso de mensagens (WhatsApp ou Email) incrementando o contador do mês atual
 * @param userId - ID do usuário
 * @param messageType - Tipo de mensagem: 'whatsapp' ou 'email'
 */
export const trackMessageUsage = async (
  userId: string,
  messageType: 'whatsapp' | 'email'
): Promise<void> => {
  try {
    // Chamar a função RPC do Supabase que incrementa o contador
    const { error } = await supabase.rpc('increment_message_usage', {
      p_user_id: userId,
      p_message_type: messageType,
    });

    if (error) {
      console.error(`Erro ao rastrear uso de ${messageType}:`, error);
      // Não lançar erro para não bloquear o fluxo principal
    } else {
      console.log(`✅ Uso de ${messageType} rastreado com sucesso`);
    }
  } catch (error) {
    console.error(`Erro inesperado ao rastrear uso de ${messageType}:`, error);
    // Não lançar erro para não bloquear o fluxo principal
  }
};


