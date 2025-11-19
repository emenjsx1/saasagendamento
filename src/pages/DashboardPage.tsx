import React, { useMemo } from 'react';
import { useBusiness } from '@/hooks/use-business';
import { useAppointmentsSummary } from '@/hooks/use-appointments-summary';
import { usePeriodFinanceSummary } from '@/hooks/use-period-finance-summary';
import { Loader2, Link as LinkIcon, CalendarCheck, Clock, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DashboardPage = () => {
  const { business, isLoading: isBusinessLoading, isRegistered, businessId } = useBusiness();
  const { todayCount, weekCount, isLoading: isSummaryLoading } = useAppointmentsSummary(businessId);

  // Definir o período para HOJE de forma estável para evitar loop de renderização.
  // O useMemo com array vazio garante que dailyRange.from e .to sejam o mesmo objeto
  // em todas as renderizações, resolvendo o loop.
  const dailyRange = useMemo(() => {
    const today = new Date();
    return {
      from: startOfDay(today),
      to: endOfDay(today),
    };
  }, []);

  const { 
    totalRevenue: dailyRevenue, 
    totalExpense: dailyExpense, 
    netProfit: dailyProfit, 
    isLoading: isDailyFinanceLoading 
  } = usePeriodFinanceSummary(businessId, dailyRange.from, dailyRange.to);

  const isLoading = isBusinessLoading || isSummaryLoading || isDailyFinanceLoading;
  const currentMonth = format(new Date(), 'MMMM', { locale: ptBR });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not registered, redirect to registration page
  if (!isRegistered) {
    return <Navigate to="/register-business" replace />;
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/book/${businessId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de agendamento copiado!");
  };

  // Display Dashboard content
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Painel do Dia ({format(dailyRange.from, 'dd/MM/yyyy')})</h1>
      <p className="text-gray-600">{business?.description || "Visão geral e estatísticas do seu negócio."}</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card 1: Agendamentos Hoje */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
            <p className="text-xs text-muted-foreground">
              {todayCount} agendamento(s) pendente(s)/confirmado(s).
            </p>
            <Button asChild variant="link" size="sm" className="p-0 h-auto mt-2">
              <Link to="/dashboard/agenda">Ver Agenda</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Receita do Dia */}
        <Card className="border-l-4 border-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Dia</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(dailyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Total de entradas (Agendamentos Concluídos + Manuais).
            </p>
            <Button asChild variant="link" size="sm" className="p-0 h-auto mt-2">
              <Link to="/dashboard/finance">Ver Financeiro</Link>
            </Button>
          </CardContent>
        </Card>
        
        {/* Card 3: Despesa do Dia */}
        <Card className="border-l-4 border-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesa do Dia</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(dailyExpense)}</div>
            <p className="text-xs text-muted-foreground">
              Total de saídas registradas hoje.
            </p>
            <Button asChild variant="link" size="sm" className="p-0 h-auto mt-2">
              <Link to="/dashboard/finance">Ver Financeiro</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card 4: Lucro do Dia */}
        <Card className={`border-l-4 ${dailyProfit >= 0 ? 'border-primary' : 'border-red-700'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido do Dia</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dailyProfit >= 0 ? 'text-primary' : 'text-red-700'}`}>{formatCurrency(dailyProfit)}</div>
            <p className="text-xs text-muted-foreground">
              Resultado financeiro de hoje.
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
      
      {/* Link de Agendamento (Movido para baixo) */}
      <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Link de Agendamento Público</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold mb-2">Compartilhe este link com seus clientes:</p>
            <p className="text-sm text-muted-foreground truncate">
              {window.location.origin}/book/{businessId}
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