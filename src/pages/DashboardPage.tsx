import React, { useMemo, useState } from 'react';
import { useBusiness } from '@/hooks/use-business';
import { useAppointmentsSummary } from '@/hooks/use-appointments-summary';
import { usePeriodFinanceSummary } from '@/hooks/use-period-finance-summary';
import { Loader2, Link as LinkIcon, CalendarCheck, Clock, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PeriodFilter } from '@/components/PeriodFilter';

interface DateRange {
  from: Date;
  to: Date;
}

const DashboardPage = () => {
  const { business, isLoading: isBusinessLoading, isRegistered, businessId, businessSlug } = useBusiness();
  
  // Inicializa o filtro para a Semana Atual
  const initialRange: DateRange = useMemo(() => {
    const today = new Date();
    return {
      from: startOfWeek(today, { weekStartsOn: 1 }), // Segunda-feira
      to: endOfDay(today),
    };
  }, []);

  const [periodRange, setPeriodRange] = useState<DateRange>(initialRange);

  const { periodCount, weekCount, isLoading: isSummaryLoading } = useAppointmentsSummary(
    businessId,
    periodRange.from,
    periodRange.to
  );

  const { 
    totalRevenue: periodRevenue, 
    totalExpense: periodExpense, 
    netProfit: periodProfit, 
    isLoading: isFinanceLoading 
  } = usePeriodFinanceSummary(businessId, periodRange.from, periodRange.to);

  const isLoading = isBusinessLoading || isSummaryLoading || isFinanceLoading;
  
  const periodLabel = `${format(periodRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(periodRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not registered, redirect to registration page
  if (!isRegistered || !businessSlug) {
    return <Navigate to="/register-business" replace />;
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/book/${businessSlug}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de agendamento copiado!");
  };

  // Display Dashboard content
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Painel de Gestão</h1>
      
      {/* Filtro de Período */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-gray-700">Resumo do Período:</h2>
        <PeriodFilter range={periodRange} setRange={setPeriodRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card 1: Agendamentos no Período */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos no Período</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodCount}</div>
            <p className="text-xs text-muted-foreground">
              {periodCount} agendamento(s) pendente(s)/confirmado(s).
            </p>
            <Button asChild variant="link" size="sm" className="p-0 h-auto mt-2">
              <Link to="/dashboard/agenda">Ver Agenda</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Receita do Período */}
        <Card className="border-l-4 border-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(periodRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Total de entradas no período ({periodLabel}).
            </p>
            <Button asChild variant="link" size="sm" className="p-0 h-auto mt-2">
              <Link to="/dashboard/finance">Ver Financeiro</Link>
            </Button>
          </CardContent>
        </Card>
        
        {/* Card 3: Despesa do Período */}
        <Card className="border-l-4 border-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesa Total</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(periodExpense)}</div>
            <p className="text-xs text-muted-foreground">
              Total de saídas no período ({periodLabel}).
            </p>
            <Button asChild variant="link" size="sm" className="p-0 h-auto mt-2">
              <Link to="/dashboard/finance">Ver Financeiro</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card 4: Lucro do Período */}
        <Card className={`border-l-4 ${periodProfit >= 0 ? 'border-primary' : 'border-red-700'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${periodProfit >= 0 ? 'text-primary' : 'text-red-700'}`}>{formatCurrency(periodProfit)}</div>
            <p className="text-xs text-muted-foreground">
              Resultado financeiro do período ({periodLabel}).
            </p>
            <Button asChild variant="link" size="sm" className="p-0 h-auto mt-2">
              <Link to="/dashboard/finance">Ver Financeiro</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions Section */}
      <div className="pt-4">
        <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button asChild variant="secondary">
            <Link to="/dashboard/agenda">Ver Todos os Agendamentos</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/dashboard/services">Adicionar/Editar Serviços</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/register-business">Editar Página de Agendamento</Link>
          </Button>
        </div>
      </div>
      
      {/* Link de Agendamento */}
      <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Link de Agendamento Público</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold mb-2">Compartilhe este link com seus clientes:</p>
            <p className="text-sm text-muted-foreground truncate">
              {window.location.origin}/book/{businessSlug}
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handleCopyLink}>
              Copiar Link
            </Button>
          </CardContent>
        </Card>
    </div>
  );
};

export default DashboardPage;