import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

const FinancePage: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center">
        <DollarSign className="h-7 w-7 mr-3" />
        Gestão Financeira
      </h1>
      <p className="text-gray-600">Visão geral de receitas, despesas e lucro líquido do seu negócio.</p>

      <Card>
        <CardHeader>
          <CardTitle>Em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Esta seção será implementada para permitir o registro de receitas e despesas, e a visualização do lucro líquido.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancePage;