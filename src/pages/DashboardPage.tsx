import React, { useMemo, useState } from 'react';
import { useBusiness } from '@/hooks/use-business';
import { useAppointmentsSummary } from '@/hooks/use-appointments-summary';
import { usePeriodFinanceSummary } from '@/hooks/use-period-finance-summary';
import { usePlanLimits } from '@/hooks/use-plan-limits';
import { Loader2, Link as LinkIcon, CalendarCheck, Clock, DollarSign, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PeriodFilter } from '@/components/PeriodFilter';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DateRange {
  from: Date;
  to: Date;
}

const DashboardPage = () => {
  const { business, isLoading: isBusinessLoading, isRegistered, businessId, businessSlug } = useBusiness();
  const { currentCurrency, T } = useCurrency();
  const { limits, isLoading: isLimitsLoading } = usePlanLimits();
  
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

  const isLoading = isBusinessLoading || isSummaryLoading || isFinanceLoading || isLimitsLoading;
  
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
    <div className="space-y-4 sm:space-y-6 pb-6">
      <div className="w-full rounded-3xl bg-gradient-to-r from-black via-gray-900 to-gray-800 text-white p-4 sm:p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
          <div>
            <p className="uppercase tracking-[0.4em] text-xs text-gray-400 mb-2">Painel Executivo</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-1 mb-2">{business?.name || 'Seu Negócio'}</h1>
            <p className="text-gray-300 mt-1 max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed">
              Visualize em tempo real os indicadores mais críticos do seu negócio, acompanhe as finanças e mantenha o controle de todos os agendamentos com precisão.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
            <div className="text-center px-3 py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-1">Status</p>
              <p className="text-base sm:text-lg font-semibold text-white">Operacional</p>
            </div>
            <Button 
              variant="outline" 
              className="border-gray-300 bg-white text-gray-900 hover:bg-gray-100 w-full sm:w-auto px-4 py-2 text-sm font-semibold"
              onClick={handleCopyLink}
            >
              Copiar Link Público
            </Button>
          </div>
        </div>
        {/* Alerta de Limite de Agendamentos (Free) */}
        {limits.planName === 'free' && limits.maxAppointments !== null && (
          <div className="mb-6">
            <Alert className={cn(
              "border-2 rounded-xl",
              limits.appointmentsUsed >= limits.maxAppointments
                ? "border-orange-500 bg-orange-50"
                : limits.appointmentsRemaining !== null && limits.appointmentsRemaining <= 5
                ? "border-yellow-500 bg-yellow-50"
                : "border-blue-500 bg-blue-50"
            )}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm sm:text-base text-black mb-1">
                    {limits.appointmentsUsed >= limits.maxAppointments
                      ? T('Limite de agendamentos atingido!', 'Appointment limit reached!')
                      : T('Agendamentos do mês:', 'Monthly appointments:')
                    }
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <Progress 
                      value={limits.maxAppointments ? (limits.appointmentsUsed / limits.maxAppointments) * 100 : 0} 
                      className="h-2 flex-1"
                    />
                    <span className="text-sm font-semibold text-black whitespace-nowrap">
                      {limits.appointmentsUsed}/{limits.maxAppointments}
                    </span>
                  </div>
                  {limits.appointmentsRemaining !== null && limits.appointmentsRemaining <= 5 && limits.appointmentsRemaining > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      {T(`Restam ${limits.appointmentsRemaining} agendamentos`, `Only ${limits.appointmentsRemaining} appointments remaining`)}
                    </p>
                  )}
                  {limits.appointmentsUsed >= limits.maxAppointments && (
                    <p className="text-xs text-gray-600 mt-2">
                      {T('Atualize para continuar criando agendamentos.', 'Upgrade to continue creating appointments.')}
                    </p>
                  )}
                </div>
                {limits.appointmentsUsed >= limits.maxAppointments && (
                  <Button asChild size="sm" className="bg-black hover:bg-black/90 text-white">
                    <Link to="/pricing">
                      {T('Ver Planos', 'View Plans')}
                    </Link>
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
          <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">Agenda Hoje</p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold mt-1 mb-2">{periodCount}</p>
            <p className="text-gray-400 text-xs sm:text-sm mt-1 leading-relaxed">Agendamentos entre {periodLabel}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">Receita</p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold mt-1 mb-2">{formatCurrency(periodRevenue, currentCurrency.key, currentCurrency.locale)}</p>
            <p className="text-gray-400 text-xs sm:text-sm mt-1 leading-relaxed">Entradas registradas no período</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">Lucro Líquido</p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold mt-1 mb-2">{formatCurrency(periodProfit, currentCurrency.key, currentCurrency.locale)}</p>
            <p className="text-gray-400 text-xs sm:text-sm mt-1 leading-relaxed">Resultado financeiro consolidado</p>
          </div>
        </div>
      </div>

      {/* Perfil e filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="col-span-1 lg:col-span-2 bg-white border-2 border-gray-300 rounded-3xl shadow-2xl">
          <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Resumo Inteligente</CardTitle>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">Personalize o intervalo para acompanhar o desempenho</p>
            </div>
            <div className="w-full md:w-auto">
              <PeriodFilter range={periodRange} setRange={setPeriodRange} />
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="rounded-2xl border border-gray-100 p-4 sm:p-5 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-gray-500">Agendamentos</span>
                <CalendarCheck className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold mt-2 mb-3 text-gray-900">{periodCount}</p>
              <Link to="/dashboard/agenda" className="text-xs font-semibold uppercase tracking-widest text-gray-500 mt-3 inline-flex items-center gap-2">
                Ver agenda <ArrowUp className="h-3 w-3" />
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4 sm:p-5 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-gray-500">Receitas</span>
                <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold mt-2 mb-3 text-emerald-600">{formatCurrency(periodRevenue, currentCurrency.key, currentCurrency.locale)}</p>
              <Link to="/dashboard/finance" className="text-xs font-semibold uppercase tracking-widest text-gray-500 mt-3 inline-flex items-center gap-2">
                Financeiro <ArrowUp className="h-3 w-3" />
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4 sm:p-5 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-gray-500">Despesas</span>
                <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5 text-rose-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold mt-2 mb-3 text-rose-600">{formatCurrency(periodExpense, currentCurrency.key, currentCurrency.locale)}</p>
              <Link to="/dashboard/finance" className="text-xs font-semibold uppercase tracking-widest text-gray-500 mt-3 inline-flex items-center gap-2">
                Ajustar custos <ArrowUp className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-2 border-gray-300 shadow-2xl bg-white">
          <CardHeader className="pb-3 p-4 sm:p-6 border-b-2 border-gray-200">
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Perfil do proprietário</CardTitle>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-600">Personalize sua marca</p>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-4">
            <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-black text-white flex items-center justify-center text-2xl font-bold">
                {business?.name?.substring(0, 2).toUpperCase() || 'AG'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{business?.name || 'Negócio sem nome'}</p>
                <p className="text-sm text-gray-600 truncate">{business?.city || 'Cidade não informada'}</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button asChild className="w-full rounded-2xl bg-black hover:bg-black/90 text-white shadow-lg font-semibold">
                <Link to="/register-business">Atualizar página pública</Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-2xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold">
                <Link to="/profile">Editar informações pessoais</Link>
              </Button>
            </div>
            <div className="rounded-2xl border-2 border-dashed border-gray-300 p-4 text-center text-sm text-gray-600 bg-gray-50">
              Adicione fotos, logotipo e mensagem de boas-vindas para elevar a percepção da sua marca.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {[
          { title: 'Gerenciar Agenda', description: 'Confirme ou remarque rapidamente os próximos atendimentos.', link: '/dashboard/agenda' },
          { title: 'Serviços & Catálogo', description: 'Atualize preços, duração e destaque seus serviços mais rentáveis.', link: '/dashboard/services' },
          { title: 'Personalizar Página', description: 'Defina fotos, mensagem e tema da sua página pública.', link: '/register-business' },
        ].map((item) => (
          <div key={item.title} className="rounded-3xl border-2 border-gray-300 p-4 sm:p-5 bg-white shadow-xl flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-800 font-bold">{item.title}</p>
            <p className="text-gray-800 text-xs sm:text-sm flex-grow leading-relaxed font-medium">{item.description}</p>
            <Button asChild variant="outline" className="rounded-full border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 text-xs sm:text-sm justify-between px-3 py-2 font-medium">
              <Link to={item.link}>
                Acessar área
                <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
        ))}
      </div>

      {/* Link público */}
      <Card className="rounded-3xl border-2 border-gray-300 shadow-2xl bg-white">
        <CardHeader className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between p-4 sm:p-6 border-b-2 border-gray-200">
          <div>
            <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Link de agendamento público</CardTitle>
            <p className="text-xs sm:text-sm text-gray-700 mt-1 leading-relaxed font-medium">Compartilhe com seus clientes e receba novos agendamentos 24/7</p>
          </div>
          <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-800" />
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-4">
          <div className="rounded-2xl border-2 border-dashed border-gray-400 bg-gray-100 p-4 text-sm text-gray-900 break-all font-mono">
            {window.location.origin}/book/{businessSlug}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={handleCopyLink} className="rounded-2xl bg-black text-white hover:bg-black/90 font-semibold shadow-lg">
              Copiar link agora
            </Button>
            <Button variant="outline" className="rounded-2xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold">
              Visualizar página pública
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;