import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubscriptionConfig {
  trial_days: number;
  base_prices: Record<'weekly' | 'monthly' | 'annual', number>;
}

export interface PaymentGatewayConfig {
  mpesa_active: boolean;
  mpesa_fee_percent: number;
  emola_active: boolean;
  emola_fee_percent: number;
  card_active: boolean;
  card_fee_percent: number;
  // Note: API keys are typically stored securely as Supabase Secrets, not in this table.
}

export interface EmailTemplate {
  subject: string;
  body: string; // HTML content
}

export interface EmailTemplates {
  appointment_confirmed: EmailTemplate;
  appointment_pending: EmailTemplate;
  payment_reminder: EmailTemplate;
  trial_expiration: EmailTemplate;
}

export interface PlatformSettings {
  id: string;
  email_templates: EmailTemplates;
  payment_gateways: PaymentGatewayConfig;
  subscription_config: SubscriptionConfig;
}

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

const defaultPaymentGateways: PaymentGatewayConfig = {
  mpesa_active: true,
  mpesa_fee_percent: 2.5,
  emola_active: true,
  emola_fee_percent: 3.0,
  card_active: false,
  card_fee_percent: 5.0,
};

const defaultSubscriptionConfig: SubscriptionConfig = {
  trial_days: 3,
  base_prices: { weekly: 147, monthly: 588, annual: 7644 },
};


export const useAdminSettings = () => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    
    // Tenta buscar a única linha de configurações
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
      toast.error("Erro ao carregar configurações da plataforma.");
      console.error(error);
      setSettings(null);
    } else if (data) {
      setSettings(data as PlatformSettings);
    } else {
      // Se não houver linha, insere a linha padrão
      const initialSettings = {
        email_templates: defaultEmailTemplates,
        payment_gateways: defaultPaymentGateways,
        subscription_config: defaultSubscriptionConfig,
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('platform_settings')
        .insert(initialSettings)
        .select('*')
        .single();
        
      if (insertError) {
        console.error("Failed to insert default settings:", insertError);
        toast.error("Falha ao inicializar configurações padrão.");
      } else {
        setSettings(insertData as PlatformSettings);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<PlatformSettings>) => {
    if (!settings) return;
    
    const loadingToastId = toast.loading("Salvando configurações...");
    
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update(newSettings)
        .eq('id', settings.id);

      if (error) throw error;
      
      // Atualiza o estado local
      setSettings(prev => ({ ...prev!, ...newSettings }));
      toast.success("Configurações salvas com sucesso!", { id: loadingToastId });
      return true;
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message, { id: loadingToastId });
      console.error(error);
      return false;
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    refresh: fetchSettings,
  };
};