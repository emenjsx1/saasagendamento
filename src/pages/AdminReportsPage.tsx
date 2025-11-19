import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const AdminReportsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center text-red-600">
        <BarChart3 className="h-7 w-7 mr-3" />
        Relatórios da Plataforma
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Esta seção fornecerá relatórios agregados sobre o desempenho da plataforma, incluindo receita total, crescimento de usuários e adoção de negócios.</p>
          <p className="mt-2 font-semibold">Status: Funcionalidade em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReportsPage;