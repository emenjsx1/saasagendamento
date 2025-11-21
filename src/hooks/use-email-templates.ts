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
        setTemplates(data.email_templates as EmailTemplates);
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