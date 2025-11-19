import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center">
        <BarChart3 className="h-7 w-7 mr-3" />
        Relatórios e Desempenho
      </h1>
      <p className="text-gray-600">Análise de agendamentos, serviços mais vendidos e desempenho financeiro.</p>

      <Card>
        <CardHeader>
          <CardTitle>Em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Esta seção fornecerá gráficos e tabelas interativas para analisar o desempenho do seu negócio.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;