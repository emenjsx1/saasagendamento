import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Loader2 } from 'lucide-react';
import { useAdminSettings } from '@/hooks/use-admin-settings';
import EmailTemplatesForm from '@/components/admin/EmailTemplatesForm';
import PaymentGatewaysForm from '@/components/admin/PaymentGatewaysForm';
import SubscriptionConfigForm from '@/components/admin/SubscriptionConfigForm';

const AdminSettingsPage: React.FC = () => {
  const { settings, isLoading, updateSettings } = useAdminSettings();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }
  
  if (!settings) {
      return <div className="text-center p-10 text-red-500">Erro ao carregar configurações. Verifique se você é um administrador.</div>;
  }

  // Handlers para atualizar sub-seções
  const handleUpdateEmailTemplates = async (templates: any) => {
    return updateSettings({ email_templates: templates });
  };
  
  const handleUpdatePaymentGateways = async (gateways: any) => {
    return updateSettings({ payment_gateways: gateways });
  };
  
  const handleUpdateSubscriptionConfig = async (config: any) => {
    return updateSettings({ subscription_config: config });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center text-red-600">
        <Settings className="h-7 w-7 mr-3" />
        Configurações da Plataforma
      </h1>
      
      {/* 1. Gestão de Comunicação e E-mails */}
      <EmailTemplatesForm 
        initialTemplates={settings.email_templates}
        updateSettings={handleUpdateEmailTemplates}
      />
      
      {/* 2. Integrações de Pagamento */}
      <PaymentGatewaysForm
        initialConfig={settings.payment_gateways}
        updateSettings={handleUpdatePaymentGateways}
      />
      
      {/* 3. Configurações de Assinatura Global */}
      <SubscriptionConfigForm
        initialConfig={settings.subscription_config}
        updateSettings={handleUpdateSubscriptionConfig}
      />
    </div>
  );
};

export default AdminSettingsPage;