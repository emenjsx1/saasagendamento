import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

const AdminSettingsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center text-red-600">
        <Settings className="h-7 w-7 mr-3" />
        Configurações da Plataforma
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Ajustes Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aqui o administrador poderá configurar integrações de pagamento, chaves de API e ajustes globais da plataforma.</p>
          <p className="mt-2 font-semibold">Status: Funcionalidade em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettingsPage;