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
import { useCurrency } from '@/contexts/CurrencyContext';

interface DateRange {
  from: Date;
  to: Date;
}

const DashboardPage = () => {
  const { business, isLoading: isBusinessLoading, isRegistered, businessId, businessSlug } = useBusiness();
  const { currentCurrency } = useCurrency();
  
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
    <div className="space-y-8 pb-10">
      <div className="w-full rounded-3xl bg-gradient-to-r from-black via-gray-900 to-gray-800 text-white p-8 md:p-10 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="uppercase tracking-[0.4em] text-xs text-gray-400">Painel Executivo</p>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-2">{business?.name || 'Seu Negócio'}</h1>
            <p className="text-gray-300 mt-2 max-w-2xl text-sm md:text-base">
              Visualize em tempo real os indicadores mais críticos do seu negócio, acompanhe as finanças e mantenha o controle de todos os agendamentos com precisão.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Status</p>
              <p className="text-lg font-semibold text-white mt-1">Operacional</p>
            </div>
            <Button 
              variant="outline" 
              className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto"
              onClick={handleCopyLink}
            >
              Copiar Link Público
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Agenda Hoje</p>
            <p className="text-3xl font-bold mt-2">{periodCount}</p>
            <p className="text-gray-400 text-sm mt-1">Agendamentos entre {periodLabel}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Receita</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(periodRevenue, currentCurrency.key, currentCurrency.locale)}</p>
            <p className="text-gray-400 text-sm mt-1">Entradas registradas no período</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Lucro Líquido</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(periodProfit, currentCurrency.key, currentCurrency.locale)}</p>
            <p className="text-gray-400 text-sm mt-1">Resultado financeiro consolidado</p>
          </div>
        </div>
      </div>

      {/* Perfil e filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 bg-white border border-black/5 rounded-3xl shadow-xl">
          <CardHeader className="pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-semibold text-black">Resumo Inteligente</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Personalize o intervalo para acompanhar o desempenho</p>
            </div>
            <div className="w-full md:w-auto">
              <PeriodFilter range={periodRange} setRange={setPeriodRange} />
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Agendamentos</span>
                <CalendarCheck className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold mt-3 text-gray-900">{periodCount}</p>
              <Link to="/dashboard/agenda" className="text-xs font-semibold uppercase tracking-widest text-gray-500 mt-4 inline-flex items-center gap-2">
                Ver agenda <ArrowUp className="h-3 w-3" />
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Receitas</span>
                <ArrowUp className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-bold mt-3 text-emerald-600">{formatCurrency(periodRevenue, currentCurrency.key, currentCurrency.locale)}</p>
              <Link to="/dashboard/finance" className="text-xs font-semibold uppercase tracking-widest text-gray-500 mt-4 inline-flex items-center gap-2">
                Financeiro <ArrowUp className="h-3 w-3" />
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Despesas</span>
                <ArrowDown className="h-5 w-5 text-rose-500" />
              </div>
              <p className="text-3xl font-bold mt-3 text-rose-600">{formatCurrency(periodExpense, currentCurrency.key, currentCurrency.locale)}</p>
              <Link to="/dashboard/finance" className="text-xs font-semibold uppercase tracking-widest text-gray-500 mt-4 inline-flex items-center gap-2">
                Ajustar custos <ArrowUp className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-gray/10 shadow-xl bg-gray-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900">Perfil do proprietário</CardTitle>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Personalize sua marca</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-gray-200 p-4 bg-white flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-black text-white flex items-center justify-center text-2xl font-bold">
                {business?.name?.substring(0, 2).toUpperCase() || 'AG'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{business?.name || 'Negócio sem nome'}</p>
                <p className="text-sm text-gray-500 truncate">{business?.city || 'Cidade não informada'}</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button asChild className="w-full rounded-2xl bg-black hover:bg-black/90 text-white shadow-lg">
                <Link to="/register-business">Atualizar página pública</Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-2xl border-black/10 bg-white hover:bg-gray-50">
                <Link to="/profile">Editar informações pessoais</Link>
              </Button>
            </div>
            <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
              Adicione fotos, logotipo e mensagem de boas-vindas para elevar a percepção da sua marca.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Gerenciar Agenda', description: 'Confirme ou remarque rapidamente os próximos atendimentos.', link: '/dashboard/agenda' },
          { title: 'Serviços & Catálogo', description: 'Atualize preços, duração e destaque seus serviços mais rentáveis.', link: '/dashboard/services' },
          { title: 'Personalizar Página', description: 'Defina fotos, mensagem e tema da sua página pública.', link: '/register-business' },
        ].map((item) => (
          <div key={item.title} className="rounded-3xl border border-gray-200 p-5 bg-white shadow-sm flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{item.title}</p>
            <p className="text-gray-600 text-sm flex-grow">{item.description}</p>
            <Button asChild variant="outline" className="rounded-full border-black/10 text-sm justify-between">
              <Link to={item.link}>
                Acessar área
                <ArrowUp className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ))}
      </div>

      {/* Link público */}
      <Card className="rounded-3xl border border-gray-200 shadow-xl bg-white/90">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-black">Link de agendamento público</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Compartilhe com seus clientes e receba novos agendamentos 24/7</p>
          </div>
          <LinkIcon className="h-5 w-5 text-gray-400" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-700 break-all">
            {window.location.origin}/book/{businessSlug}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={handleCopyLink} className="rounded-2xl bg-black text-white hover:bg-black/90">
              Copiar link agora
            </Button>
            <Button variant="outline" className="rounded-2xl border-black/10">
              Visualizar página pública
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;