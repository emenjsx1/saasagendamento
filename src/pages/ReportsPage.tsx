import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Loader2 } from 'lucide-react';
import MonthlyBarChart from '@/components/MonthlyBarChart';
import { useBusiness } from '@/hooks/use-business';
import { useMonthlyFinanceData } from '@/hooks/use-monthly-finance-data';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ReportsPage: React.FC = () => {
  const { businessId, isLoading: isBusinessLoading } = useBusiness();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  const { data: monthlyData, isLoading: isChartLoading } = useMonthlyFinanceData(businessId, selectedYear);

  const isLoading = isBusinessLoading || isChartLoading;

  // Gera opções de ano (Ano atual e os 4 anos anteriores)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

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
        Relatórios Financeiros
      </h1>
      
      {/* Filtro de Ano */}
      <div className="flex items-center space-x-4">
        <p className="text-gray-600">Selecione o ano:</p>
        <Select 
          onValueChange={(value) => setSelectedYear(parseInt(value))} 
          value={selectedYear.toString()}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <h2 className="text-xl font-semibold text-gray-700">Visão geral do desempenho financeiro do seu negócio em {selectedYear}.</h2>

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
        title={`Receitas vs Despesas por Mês (${selectedYear})`} 
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