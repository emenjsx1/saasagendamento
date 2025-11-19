import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Mail, CreditCard, Zap } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const AdminSettingsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center text-red-600">
        <Settings className="h-7 w-7 mr-3" />
        Configurações da Plataforma
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl"><Mail className="h-5 w-5 mr-2" /> Gestão de Comunicação e E-mails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Gerencie os templates de e-mail automáticos enviados aos clientes (confirmação, cancelamento, lembretes).</p>
          <div className="border p-4 rounded-md bg-gray-50">
            <h4 className="font-semibold">Templates de E-mail</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
              <li>Confirmação de Agendamento (Pendente/Confirmado)</li>
              <li>Lembrete de Pagamento (Assinatura)</li>
              <li>Notificação de Vencimento de Teste Gratuito</li>
            </ul>
            <p className="mt-3 font-semibold text-red-500">Status: Editor de templates em desenvolvimento.</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl"><CreditCard className="h-5 w-5 mr-2" /> Integrações de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Configure as chaves de API para provedores de pagamento (M-Pesa, e-Mola, Cartão) e gerencie as taxas de transação.</p>
          <div className="border p-4 rounded-md bg-gray-50">
            <h4 className="font-semibold">Chaves de API</h4>
            <p className="text-sm text-gray-600 mt-1">Gerencie as credenciais para ativar pagamentos automáticos e monitoramento de status.</p>
            <p className="mt-3 font-semibold text-red-500">Status: Integração de gateways de pagamento em desenvolvimento.</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl"><Zap className="h-5 w-5 mr-2" /> Configurações de Assinatura Global</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Ajustes globais para planos de assinatura, como duração do teste gratuito e preços padrão.</p>
          <p className="mt-2 font-semibold text-red-500">Status: Gestão de planos em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettingsPage;