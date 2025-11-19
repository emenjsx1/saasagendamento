import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Loader2 } from 'lucide-react';
import MonthlyBarChart from '@/components/MonthlyBarChart';
import { useBusiness } from '@/hooks/use-business';
import { useMonthlyFinanceData } from '@/hooks/use-monthly-finance-data';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

const ReportsPage: React.FC = () => {
  const { businessId, isLoading: isBusinessLoading } = useBusiness();
  const { data: monthlyData, isLoading: isChartLoading } = useMonthlyFinanceData(businessId);

  const isLoading = isBusinessLoading || isChartLoading;
  const currentYear = new Date().getFullYear();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!businessId) {
    return (
      <Card className="p-6 text-center">
        <CardTitle className="text-xl mb-4">Negócio Não Cadastrado</CardTitle>
        <p className="mb-4">Você precisa cadastrar as informações do seu negócio antes de visualizar relatórios.</p>
        <Button asChild>
          <a href="/register-business">Cadastrar Meu Negócio</a>
        </Button>
      </Card>
    );
  }

  // Calcula o Lucro Líquido Anual
  const totalRevenueYear = monthlyData.reduce((sum, item) => sum + item.Receita, 0);
  const totalExpenseYear = monthlyData.reduce((sum, item) => sum + item.Despesa, 0);
  const netProfitYear = totalRevenueYear - totalExpenseYear;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center">
        <BarChart3 className="h-7 w-7 mr-3" />
        Relatórios Financeiros ({currentYear})
      </h1>
      <p className="text-gray-600">Visão geral do desempenho financeiro do seu negócio ao longo do ano.</p>

      {/* Resumo Anual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Receita Anual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenueYear)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Despesa Anual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenseYear)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Lucro Líquido Anual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfitYear >= 0 ? 'text-primary' : 'text-red-700'}`}>{formatCurrency(netProfitYear)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Desempenho Mensal */}
      <MonthlyBarChart 
        data={monthlyData} 
        title={`Receitas vs Despesas por Mês (${currentYear})`} 
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Relatórios de Agendamento (Futuro)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Em breve: Análise de serviços mais agendados, horários de pico e desempenho de clientes.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;