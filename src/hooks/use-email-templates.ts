import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EmailTemplates, defaultEmailTemplates } from './use-admin-settings';

interface UseEmailTemplatesResult {
  templates: EmailTemplates | null;
  isLoading: boolean;
}


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
        // Em caso de erro, usar os defaults modernos do use-admin-settings
        setTemplates(defaultEmailTemplates);
      } else if (data && data.email_templates) {
        // Fazer merge com defaults para garantir que templates novos estejam disponíveis
        const dbTemplates = data.email_templates as EmailTemplates;
        const mergedTemplates: EmailTemplates = {
          ...defaultEmailTemplates,
          ...dbTemplates,
          // Garantir que templates novos do default estejam presentes
          new_appointment_owner: dbTemplates.new_appointment_owner || defaultEmailTemplates.new_appointment_owner,
          appointment_cancelled: dbTemplates.appointment_cancelled || defaultEmailTemplates.appointment_cancelled,
          appointment_rejected: dbTemplates.appointment_rejected || defaultEmailTemplates.appointment_rejected,
          appointment_completed: dbTemplates.appointment_completed || defaultEmailTemplates.appointment_completed,
          client_welcome: dbTemplates.client_welcome || defaultEmailTemplates.client_welcome,
          owner_welcome: dbTemplates.owner_welcome || defaultEmailTemplates.owner_welcome,
          business_configured: dbTemplates.business_configured || defaultEmailTemplates.business_configured,
          admin_new_registration: dbTemplates.admin_new_registration || defaultEmailTemplates.admin_new_registration,
          admin_new_payment: dbTemplates.admin_new_payment || defaultEmailTemplates.admin_new_payment,
        };
        setTemplates(mergedTemplates);
      } else {
        // Se a linha não existir, usar os defaults modernos
        // O use-admin-settings criará a linha com os defaults modernos quando necessário
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