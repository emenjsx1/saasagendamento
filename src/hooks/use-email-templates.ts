import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EmailTemplates } from './use-admin-settings';

interface UseEmailTemplatesResult {
  templates: EmailTemplates | null;
  isLoading: boolean;
}

// Default templates (should match defaults in use-admin-settings)
const defaultEmailTemplates: EmailTemplates = {
  appointment_confirmed: {
    subject: "Agendamento CONFIRMADO: {{service_name}}",
    body: "<h1>Confirmação!</h1><p>Olá {{client_name}}, seu agendamento para {{service_name}} em {{date}} às {{time}} foi <strong>CONFIRMADO</strong>.</p><p>Código: {{client_code}}</p>",
  },
  appointment_pending: {
    subject: "Agendamento Pendente: {{service_name}}",
    body: "<h1>Agendamento Recebido</h1><p>Olá {{client_name}}, seu agendamento para {{service_name}} em {{date}} às {{time}} foi recebido e está <strong>PENDENTE</strong> de confirmação.</p><p>Código: {{client_code}}</p>",
  },
  payment_reminder: {
    subject: "Lembrete de Pagamento: Sua Assinatura",
    body: "<h1>Pagamento Pendente</h1><p>Olá, seu plano {{plan_name}} está com pagamento pendente. Por favor, finalize o pagamento de {{price}} para continuar usando a plataforma.</p>",
  },
  trial_expiration: {
    subject: "Seu Teste Gratuito Expira em Breve!",
    body: "<h1>Aviso Importante</h1><p>Olá, seu teste gratuito expira em {{days_left}} dias. Não perca o acesso! Escolha um plano pago agora.</p>",
  },
};


export const useEmailTemplates = (): UseEmailTemplatesResult => {
  const [templates, setTemplates] = useState<EmailTemplates | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      
      // Busca apenas a coluna email_templates
      const { data, error } = await supabase
        .from('platform_settings')
        .select('email_templates')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching email templates:", error);
        // Em caso de erro, usamos os defaults
        setTemplates(defaultEmailTemplates);
      } else if (data && data.email_templates) {
        setTemplates(data.email_templates as EmailTemplates);
      } else {
        // Se a linha não existir, usamos os defaults
        setTemplates(defaultEmailTemplates);
      }
      
      setIsLoading(false);
    };

    fetchTemplates();
  }, []);

  return {
    templates,
    isLoading,
  };
};