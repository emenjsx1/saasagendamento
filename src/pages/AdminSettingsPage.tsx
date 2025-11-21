import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Loader2, Mail, CreditCard, Calendar, Moon, Sun } from 'lucide-react';
import { useAdminSettings } from '@/hooks/use-admin-settings';
import EmailTemplatesForm from '@/components/admin/EmailTemplatesForm';
import PaymentGatewaysForm from '@/components/admin/PaymentGatewaysForm';
import SubscriptionConfigForm from '@/components/admin/SubscriptionConfigForm';
import CommunicationCenter from '@/components/admin/CommunicationCenter';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const AdminSettingsPage: React.FC = () => {
  const { T } = useCurrency();
  const { settings, isLoading, updateSettings } = useAdminSettings();
  const { theme, setTheme } = useTheme();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!settings) {
    return (
      <div className="text-center p-10">
        <div className="text-red-500 text-lg font-semibold mb-2">
          {T('Erro ao carregar configurações.', 'Error loading settings.')}
        </div>
        <p className="text-gray-600">
          {T('Verifique se você é um administrador.', 'Verify that you are an administrator.')}
        </p>
      </div>
    );
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shadow-lg">
              <Settings className="h-7 w-7 text-white" />
            </div>
            {T('Configurações da Plataforma', 'Platform Settings')}
          </h1>
          <p className="text-gray-600 mt-2">{T('Gerencie as configurações gerais da plataforma', 'Manage general platform settings')}</p>
        </div>
      </div>
      
      {/* Theme Settings */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Sun className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold">
              {T('Aparência', 'Appearance')}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {T('Configure o tema visual da plataforma', 'Configure the visual theme of the platform')}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">
                {T('Tema', 'Theme')}
              </Label>
              <div className="flex gap-3">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => setTheme('light')}
                  className="flex-1"
                >
                  <Sun className="h-4 w-4 mr-2" />
                  {T('Claro', 'Light')}
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => setTheme('dark')}
                  className="flex-1"
                >
                  <Moon className="h-4 w-4 mr-2" />
                  {T('Escuro', 'Dark')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communication Center */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold">
              {T('Centro de Comunicação', 'Communication Center')}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {T('Envie mensagens em massa para usuários cadastrados', 'Send bulk messages to registered users')}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <CommunicationCenter />
        </CardContent>
      </Card>

      {/* Email Templates Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Mail className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold">
              {T('Gestão de Templates de E-mail', 'Email Templates Management')}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {T('Configure os templates de e-mail enviados aos usuários', 'Configure email templates sent to users')}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <EmailTemplatesForm 
            initialTemplates={settings.email_templates}
            updateSettings={handleUpdateEmailTemplates}
          />
        </CardContent>
      </Card>
      
      {/* Payment Gateways Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold">
              {T('Integrações de Pagamento', 'Payment Integrations')}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {T('Configure os gateways de pagamento disponíveis', 'Configure available payment gateways')}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <PaymentGatewaysForm
            initialConfig={settings.payment_gateways}
            updateSettings={handleUpdatePaymentGateways}
          />
        </CardContent>
      </Card>
      
      {/* Subscription Config Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold">
              {T('Configurações de Assinatura Global', 'Global Subscription Settings')}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {T('Defina as configurações globais de assinaturas e planos', 'Define global subscription and plan settings')}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <SubscriptionConfigForm
            initialConfig={settings.subscription_config}
            updateSettings={handleUpdateSubscriptionConfig}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettingsPage;
