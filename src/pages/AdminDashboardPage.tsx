import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users } from 'lucide-react';

const AdminDashboardPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center text-red-600">
        <Shield className="h-7 w-7 mr-3" />
        Área de Administração (Acesso Restrito)
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="h-5 w-5 mr-2" /> Gestão de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Esta área é exclusiva para administradores e será usada para gerenciar todos os negócios e usuários da plataforma.</p>
          <p className="mt-2 font-semibold">Status: Funcionalidade em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;