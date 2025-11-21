import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ArrowUp, ArrowDown, Loader2, Plus, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { useBusiness } from '@/hooks/use-business';
import { usePeriodFinanceSummary } from '@/hooks/use-period-finance-summary';
import { usePeriodTransactions, Transaction } from '@/hooks/use-period-transactions';
import { useServices } from '@/hooks/use-services';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import TransactionForm from '@/components/TransactionForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { PeriodFilter } from '@/components/PeriodFilter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/contexts/CurrencyContext';

interface DateRange {
  from: Date;
  to: Date;
}

const FinancePage: React.FC = () => {
  const { businessId, isLoading: isBusinessLoading } = useBusiness();
  const { currentCurrency, T } = useCurrency();
  
  // Inicializa o filtro para o Mês Atual
  const today = new Date();
  const initialRange: DateRange = useMemo(() => ({
    from: startOfMonth(today),
    to: endOfDay(today),
  }), [today]);

  const [periodRange, setPeriodRange] = useState<DateRange>(initialRange);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { services, isLoading: isServicesLoading } = useServices(businessId);

  const { totalRevenue, totalExpense, netProfit, isLoading: isSummaryLoading } = usePeriodFinanceSummary(
    businessId,
    periodRange.from,
    periodRange.to,
    selectedServiceId
  );
  
  const { transactions, isLoading: isTransactionsLoading, refresh } = usePeriodTransactions(
    businessId,
    periodRange.from,
    periodRange.to,
    selectedServiceId
  );

  const isLoading = isBusinessLoading || isSummaryLoading || isTransactionsLoading || isServicesLoading;
  
  const periodLabel = `${format(periodRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(periodRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;

  const handleTransactionSuccess = () => {
    setIsModalOpen(false);
    refresh(); // Atualiza a lista e o resumo
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!businessId) {
    return (
      <Card className="p-6 text-center rounded-3xl border border-gray-200 shadow-xl">
        <CardTitle className="text-xl mb-4">{T('Negócio Não Cadastrado', 'Business Not Registered')}</CardTitle>
        <p className="mb-4">{T('Você precisa cadastrar as informações do seu negócio antes de gerenciar as finanças.', 'You need to register your business information before managing finances.')}</p>
        <Button asChild className="rounded-2xl bg-black text-white">
          <a href="/register-business">{T('Cadastrar Meu Negócio', 'Register My Business')}</a>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      <section className="rounded-3xl bg-gradient-to-br from-black via-gray-900 to-gray-700 text-white p-6 md:p-10 shadow-2xl flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{T('Sala financeira', 'Finance Room')}</p>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-2">{T('Gestão Estratégica', 'Strategic Management')}</h1>
            <p className="text-gray-300 mt-3 text-sm md:text-base max-w-2xl">
              {T('Controle completo do fluxo de caixa, atualizado em tempo real. Acompanhe entradas, saídas e lucro líquido em uma única visão de alto impacto.', 'Complete cash flow control, updated in real time. Track income, expenses and net profit in a single high-impact view.')}
            </p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl bg-white text-black hover:bg-white/90">
                <Plus className="h-4 w-4 mr-2" />
                {T('Nova transação', 'New Transaction')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">{T('Registrar transação manual', 'Register Manual Transaction')}</DialogTitle>
              </DialogHeader>
              <TransactionForm businessId={businessId} onSuccess={handleTransactionSuccess} />
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-2xl border border-white/15 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{T('Receita', 'Revenue')}</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(totalRevenue, currentCurrency.key, currentCurrency.locale)}</p>
            <p className="text-gray-400 text-sm mt-1">
              {T('Entradas no período selecionado', 'Income in selected period')} ({periodLabel})
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/15 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{T('Despesas', 'Expenses')}</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(totalExpense, currentCurrency.key, currentCurrency.locale)}</p>
            <p className="text-gray-400 text-sm mt-1">{T('Saídas totais controladas', 'Total controlled expenses')}</p>
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/15 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{T('Lucro líquido', 'Net Profit')}</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(netProfit, currentCurrency.key, currentCurrency.locale)}</p>
            <p className="text-gray-400 text-sm mt-1">{T('Resultado consolidado', 'Consolidated result')}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 rounded-3xl border border-black/5 shadow-xl">
          <CardHeader className="pb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-semibold">{T('Painel de filtros', 'Filter Panel')}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">{T('Defina período e serviço para refinar todos os cálculos.', 'Set period and service to refine all calculations.')}</p>
            </div>
            <div className="w-full lg:w-auto">
              <PeriodFilter range={periodRange} setRange={setPeriodRange} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-[0.3em]">
                <Filter className="h-4 w-4" />
                {T('Serviço', 'Service')}
              </div>
              <Select onValueChange={(value) => setSelectedServiceId(value === 'all' ? null : value)} value={selectedServiceId || 'all'}>
                <SelectTrigger className="w-full md:w-64 rounded-2xl border-gray-200">
                  <SelectValue placeholder={T('Filtrar por serviço', 'Filter by service')} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all">{T('Todos os serviços', 'All services')}</SelectItem>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              {T('Período analisado:', 'Analyzed period:')} <span className="font-semibold text-gray-900">{periodLabel}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-gray-200 shadow-xl bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{T('Insights rápidos', 'Quick Insights')}</CardTitle>
            <p className="text-sm text-gray-500">{T('Ações recomendadas para manter o caixa saudável.', 'Recommended actions to keep cash flow healthy.')}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              T('Verifique despesas extraordinárias acima de 20% da receita', 'Check extraordinary expenses above 20% of revenue'),
              T('Mantenha a margem líquida acima de 40%', 'Keep net margin above 40%'),
              T('Registre manualmente serviços upsell/diferenciados', 'Manually register upsell/differentiated services'),
            ].map((tip) => (
              <div key={tip} className="flex gap-3 text-sm text-gray-600">
                <span className="h-2 w-2 rounded-full bg-black mt-2 flex-shrink-0" />
                {tip}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          {
            title: T('Receita total', 'Total Revenue'),
            value: formatCurrency(totalRevenue, currentCurrency.key, currentCurrency.locale),
            icon: <ArrowUp className="h-4 w-4" />,
            description: T('Entradas registradas em serviços e vendas adicionais.', 'Income registered from services and additional sales.'),
            accent: 'bg-emerald-50',
          },
          {
            title: T('Despesa total', 'Total Expense'),
            value: formatCurrency(totalExpense, currentCurrency.key, currentCurrency.locale),
            icon: <ArrowDown className="h-4 w-4" />,
            description: T('Custos operacionais e investimentos.', 'Operational costs and investments.'),
            accent: 'bg-rose-50',
          },
          {
            title: T('Margem líquida', 'Net Margin'),
            value: `${(totalRevenue ? (netProfit / totalRevenue) * 100 : 0).toFixed(1)}%`,
            icon: <TrendingUp className="h-4 w-4" />,
            description: T('Proporção de lucro sobre faturamento.', 'Profit ratio over revenue.'),
            accent: 'bg-gray-50',
          },
        ].map((card) => (
          <div key={card.title} className={`rounded-3xl border border-gray-200 p-5 shadow-sm ${card.accent}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{card.title}</p>
              <div className="rounded-full border border-gray-300 p-2 text-gray-600">{card.icon}</div>
            </div>
            <p className="text-3xl font-bold mt-3 text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-600 mt-1">{card.description}</p>
          </div>
        ))}
      </section>

      <Card className="rounded-3xl border border-gray-200 shadow-xl">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-semibold">{T('Transações detalhadas', 'Detailed Transactions')}</CardTitle>
            <p className="text-sm text-gray-500">{T('Veja todas as movimentações filtradas em ordem cronológica.', 'View all filtered transactions in chronological order.')}</p>
          </div>
          <Button variant="outline" className="rounded-full border-black/10">{T('Exportar CSV', 'Export CSV')}</Button>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
              {T('Nenhuma transação registrada neste período com os filtros selecionados.', 'No transactions recorded in this period with selected filters.')}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="text-gray-500">{T('Data', 'Date')}</TableHead>
                    <TableHead className="text-gray-500">{T('Descrição', 'Description')}</TableHead>
                    <TableHead className="text-gray-500">{T('Fonte', 'Source')}</TableHead>
                    <TableHead className="text-gray-500">{T('Tipo', 'Type')}</TableHead>
                    <TableHead className="text-right text-gray-500">{T('Valor', 'Amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id + t.source}>
                      <TableCell className="font-semibold text-gray-800">{format(t.date, 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <p className="font-medium text-gray-900">{t.description}</p>
                        {t.type === 'expense' && t.category && (
                          <p className="text-xs text-gray-500">Categoria: {t.category}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs rounded-full px-3">
                          {t.source === 'appointment' ? T('Agendamento', 'Appointment') : T('Manual', 'Manual')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'rounded-full px-3 text-xs',
                            t.type === 'revenue' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          )}
                        >
                          {t.type === 'revenue' ? T('Receita', 'Revenue') : T('Despesa', 'Expense')}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-semibold',
                          t.type === 'revenue' ? 'text-emerald-600' : 'text-rose-600'
                        )}
                      >
                        {t.type === 'revenue' ? '+' : '-'} {formatCurrency(t.amount, currentCurrency.key, currentCurrency.locale)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancePage;