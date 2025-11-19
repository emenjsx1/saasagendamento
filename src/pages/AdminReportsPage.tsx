import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Loader2, DollarSign, Users, Briefcase } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminMonthlyRevenue } from '@/hooks/use-admin-monthly-revenue';
import { useAdminMetrics } from '@/hooks/use-admin-metrics';
import AdminMonthlyBarChart from '@/components/AdminMonthlyBarChart';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

const AdminReportsPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  const { data: monthlyRevenueData, isLoading: isChartLoading } = useAdminMonthlyRevenue(selectedYear);
  const { totalBusinesses, totalUsers, isLoading: isMetricsLoading } = useAdminMetrics();

  const isLoading = isChartLoading || isMetricsLoading;

  // Gera opções de ano (Ano atual e os 4 anos anteriores)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Calcula a Receita Líquida Anual (apenas receita, pois despesas da plataforma não são rastreadas)
  const totalRevenueYear = monthlyRevenueData.reduce((sum, item) => sum + item.Receita, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  const metrics = [
    { title: 'Receita Total da Plataforma', value: formatCurrency(totalRevenueYear), icon: DollarSign, color: 'text-green-600' },
    { title: 'Total de Negócios', value: totalBusinesses.toString(), icon: Briefcase, color: 'text-blue-600' },
    { title: 'Total de Usuários', value: totalUsers.toString(), icon: Users, color: 'text-yellow-600' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center text-red-600">
        <BarChart3 className="h-7 w-7 mr-3" />
        Relatórios da Plataforma
      </h1>
      
      {/* Filtro de Ano */}
      <div className="flex items-center space-x-4">
        <p className="text-gray-600">Selecione o ano para análise:</p>
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

      <h2 className="text-xl font-semibold text-gray-700">Visão geral do desempenho financeiro da plataforma em {selectedYear}.</h2>

      {/* Resumo Anual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className={cn("h-4 w-4", metric.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico de Desempenho Mensal */}
      <AdminMonthlyBarChart 
        data={monthlyRevenueData} 
        title={`Receita Total da Plataforma por Mês (${selectedYear})`} 
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Relatórios de Pagamentos e Assinaturas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Em breve: Relatórios detalhados sobre status de pagamento, churn e planos mais populares.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReportsPage;