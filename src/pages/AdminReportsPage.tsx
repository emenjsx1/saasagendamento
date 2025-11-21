import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Loader2, DollarSign, Users, Briefcase, TrendingUp, Calendar, Package, CreditCard, CalendarCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminMetrics } from '@/hooks/use-admin-metrics';
import AdminMonthlyBarChart from '@/components/AdminMonthlyBarChart';
import { formatCurrency } from '@/lib/utils';
import { usePlatformMonthlyRevenue } from '@/hooks/use-platform-monthly-revenue';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface PlanSalesData {
  plan_name: string;
  count: number;
  total_revenue: number;
}

interface DailyReport {
  date: string;
  appointments: number;
  payments: number;
  revenue: number;
  new_users: number;
}

const AdminReportsPage: React.FC = () => {
  const { T, currentCurrency } = useCurrency();
  const [selectedDateRange, setSelectedDateRange] = useState<'7' | '30' | '90' | '365'>('30');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  const [topPlans, setTopPlans] = useState<PlanSalesData[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [isReportsLoading, setIsReportsLoading] = useState(true);
  
  // Usar o novo hook para receita da plataforma (assinaturas)
  const currentYear = new Date().getFullYear();
  const { data: monthlyRevenueData, isLoading: isChartLoading } = usePlatformMonthlyRevenue(currentYear);
  const { totalBusinesses, totalUsers, isLoading: isMetricsLoading } = useAdminMetrics();

  const isLoading = isChartLoading || isMetricsLoading || isReportsLoading;

  // Atualizar datas quando o range muda
  useEffect(() => {
    const days = parseInt(selectedDateRange);
    setStartDate(subDays(new Date(), days));
    setEndDate(new Date());
  }, [selectedDateRange]);

  // Buscar relatórios detalhados
  useEffect(() => {
    const fetchReports = async () => {
      setIsReportsLoading(true);
      try {
        const start = format(startOfDay(startDate), 'yyyy-MM-dd');
        const end = format(endOfDay(endDate), 'yyyy-MM-dd');

        // 1. Pacotes mais comprados
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('amount, notes, payment_date')
          .eq('status', 'confirmed')
          .gte('payment_date', start)
          .lte('payment_date', end);

        if (paymentsError) throw paymentsError;

        // Agrupar por plano
        const planMap = new Map<string, { count: number; revenue: number }>();
        (paymentsData || []).forEach((payment: any) => {
          // Extrair nome do plano das notes ou usar padrão
          let planName = 'Plano Desconhecido';
          if (payment.notes) {
            const match = payment.notes.match(/assinatura\s+([^,\s]+)/i);
            if (match) {
              planName = match[1];
            } else {
              planName = payment.notes.substring(0, 30);
            }
          }

          const current = planMap.get(planName) || { count: 0, revenue: 0 };
          planMap.set(planName, {
            count: current.count + 1,
            revenue: current.revenue + parseFloat(payment.amount as any),
          });
        });

        const topPlansData: PlanSalesData[] = Array.from(planMap.entries())
          .map(([plan_name, data]) => ({
            plan_name,
            count: data.count,
            total_revenue: data.revenue,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setTopPlans(topPlansData);

        // 2. Relatórios diários
        const { data: subscriptionsData } = await supabase
          .from('subscriptions')
          .select('plan_name, created_at')
          .gte('created_at', start)
          .lte('created_at', end);

        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('created_at')
          .gte('created_at', start)
          .lte('created_at', end);

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', start)
          .lte('created_at', end);

        // Agrupar por dia
        const dailyMap = new Map<string, DailyReport>();

        // Processar pagamentos
        (paymentsData || []).forEach((payment: any) => {
          const date = format(parseISO(payment.payment_date), 'yyyy-MM-dd');
          const current = dailyMap.get(date) || {
            date,
            appointments: 0,
            payments: 0,
            revenue: 0,
            new_users: 0,
          };
          dailyMap.set(date, {
            ...current,
            payments: current.payments + 1,
            revenue: current.revenue + parseFloat(payment.amount as any),
          });
        });

        // Processar agendamentos
        (appointmentsData || []).forEach((app: any) => {
          const date = format(parseISO(app.created_at), 'yyyy-MM-dd');
          const current = dailyMap.get(date) || {
            date,
            appointments: 0,
            payments: 0,
            revenue: 0,
            new_users: 0,
          };
          dailyMap.set(date, {
            ...current,
            appointments: current.appointments + 1,
          });
        });

        // Processar novos usuários
        (profilesData || []).forEach((profile: any) => {
          const date = format(parseISO(profile.created_at), 'yyyy-MM-dd');
          const current = dailyMap.get(date) || {
            date,
            appointments: 0,
            payments: 0,
            revenue: 0,
            new_users: 0,
          };
          dailyMap.set(date, {
            ...current,
            new_users: current.new_users + 1,
          });
        });

        const dailyReportsData = Array.from(dailyMap.values())
          .sort((a, b) => a.date.localeCompare(b.date));

        setDailyReports(dailyReportsData);

      } catch (error: any) {
        console.error('Erro ao buscar relatórios:', error);
      } finally {
        setIsReportsLoading(false);
      }
    };

    fetchReports();
  }, [startDate, endDate]);

  // Calcula a Receita Líquida Anual (apenas receita, pois despesas da plataforma não são rastreadas)
  const totalRevenueYear = monthlyRevenueData.reduce((sum, item) => sum + item.Receita, 0);

  // Calcular totais do período selecionado
  const periodTotals = dailyReports.reduce(
    (acc, day) => ({
      appointments: acc.appointments + day.appointments,
      payments: acc.payments + day.payments,
      revenue: acc.revenue + day.revenue,
      new_users: acc.new_users + day.new_users,
    }),
    { appointments: 0, payments: 0, revenue: 0, new_users: 0 }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const metrics = [
    { 
      title: T('Receita Total da Plataforma', 'Total Platform Revenue'), 
      value: formatCurrency(totalRevenueYear, currentCurrency.key, currentCurrency.locale), 
      icon: DollarSign, 
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      title: T('Total de Negócios', 'Total Businesses'), 
      value: totalBusinesses.toString(), 
      icon: Briefcase, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      title: T('Total de Usuários', 'Total Users'), 
      value: totalUsers.toString(), 
      icon: Users, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
            {T('Relatórios da Plataforma', 'Platform Reports')}
      </h1>
          <p className="text-gray-600 mt-2">{T('Análise completa do desempenho financeiro e operacional', 'Complete analysis of financial and operational performance')}</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              <p className="text-gray-700 font-medium">{T('Período:', 'Period:')}</p>
            </div>
        <Select 
              onValueChange={(value: '7' | '30' | '90' | '365') => setSelectedDateRange(value)} 
              value={selectedDateRange}
        >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={T('Selecione período', 'Select period')} />
          </SelectTrigger>
          <SelectContent>
                <SelectItem value="7">{T('Últimos 7 dias', 'Last 7 days')}</SelectItem>
                <SelectItem value="30">{T('Últimos 30 dias', 'Last 30 days')}</SelectItem>
                <SelectItem value="90">{T('Últimos 90 dias', 'Last 90 days')}</SelectItem>
                <SelectItem value="365">{T('Último ano', 'Last year')}</SelectItem>
          </SelectContent>
        </Select>
            <div className="text-sm text-gray-600">
              {format(startDate, 'dd/MM/yyyy', { locale: ptBR })} - {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
            </div>
      </div>
        </CardContent>
      </Card>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title} className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{metric.title}</CardTitle>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${metric.bgColor}`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{metric.value}</div>
              <p className="text-xs text-gray-500 mt-1">
                {T('Total geral', 'Total overall')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Period Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-purple-600" />
              {T('Agendamentos', 'Appointments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{periodTotals.appointments}</div>
            <p className="text-xs text-gray-500 mt-1">{T('No período', 'In period')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-green-600" />
              {T('Pagamentos', 'Payments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{periodTotals.payments}</div>
            <p className="text-xs text-gray-500 mt-1">{T('No período', 'In period')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              {T('Receita', 'Revenue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(periodTotals.revenue, currentCurrency.key, currentCurrency.locale)}
            </div>
            <p className="text-xs text-gray-500 mt-1">{T('No período', 'In period')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              {T('Novos Usuários', 'New Users')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{periodTotals.new_users}</div>
            <p className="text-xs text-gray-500 mt-1">{T('No período', 'In period')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Plans */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {T('Pacotes Mais Comprados', 'Most Purchased Plans')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topPlans.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{T('Nenhum dado disponível no período selecionado.', 'No data available for selected period.')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{T('Posição', 'Position')}</TableHead>
                  <TableHead>{T('Plano', 'Plan')}</TableHead>
                  <TableHead className="text-right">{T('Vendas', 'Sales')}</TableHead>
                  <TableHead className="text-right">{T('Receita Total', 'Total Revenue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPlans.map((plan, index) => (
                  <TableRow key={plan.plan_name}>
                    <TableCell>
                      <Badge variant="outline" className="font-bold">#{index + 1}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{plan.plan_name}</TableCell>
                    <TableCell className="text-right font-semibold">{plan.count}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(plan.total_revenue, currentCurrency.key, currentCurrency.locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Daily Reports */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {T('Relatório Diário Detalhado', 'Detailed Daily Report')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyReports.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{T('Nenhum dado disponível no período selecionado.', 'No data available for selected period.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{T('Data', 'Date')}</TableHead>
                    <TableHead className="text-right">{T('Agendamentos', 'Appointments')}</TableHead>
                    <TableHead className="text-right">{T('Pagamentos', 'Payments')}</TableHead>
                    <TableHead className="text-right">{T('Receita', 'Revenue')}</TableHead>
                    <TableHead className="text-right">{T('Novos Usuários', 'New Users')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyReports.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">
                        {format(parseISO(day.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">{day.appointments}</TableCell>
                      <TableCell className="text-right">{day.payments}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(day.revenue, currentCurrency.key, currentCurrency.locale)}
                      </TableCell>
                      <TableCell className="text-right">{day.new_users}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Revenue Chart */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {T('Receita Total da Plataforma por Mês', 'Total Platform Revenue by Month')} ({currentYear})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminMonthlyBarChart 
            data={monthlyRevenueData} 
            title={T(`Receita Total da Plataforma por Mês (${currentYear})`, `Total Platform Revenue by Month (${currentYear})`)} 
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReportsPage;
