import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ArrowUp, ArrowDown, Loader2, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useBusiness } from '@/hooks/use-business';
import { usePeriodFinanceSummary } from '@/hooks/use-period-finance-summary';
import { usePeriodTransactions, Transaction } from '@/hooks/use-period-transactions';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import TransactionForm from '@/components/TransactionForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { PeriodFilter } from '@/components/PeriodFilter';

interface DateRange {
  from: Date;
  to: Date;
}

const FinancePage: React.FC = () => {
  const { businessId, isLoading: isBusinessLoading } = useBusiness();
  
  // Inicializa o filtro para o Mês Atual
  const today = new Date();
  const initialRange: DateRange = useMemo(() => ({
    from: startOfMonth(today),
    to: endOfDay(today),
  }), [today]);

  const [periodRange, setPeriodRange] = useState<DateRange>(initialRange);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { totalRevenue, totalExpense, netProfit, isLoading: isSummaryLoading } = usePeriodFinanceSummary(
    businessId,
    periodRange.from,
    periodRange.to
  );
  
  const { transactions, isLoading: isTransactionsLoading, refresh } = usePeriodTransactions(
    businessId,
    periodRange.from,
    periodRange.to
  );

  const isLoading = isBusinessLoading || isSummaryLoading || isTransactionsLoading;
  
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
      <Card className="p-6 text-center">
        <CardTitle className="text-xl mb-4">Negócio Não Cadastrado</CardTitle>
        <p className="mb-4">Você precisa cadastrar as informações do seu negócio antes de gerenciar as finanças.</p>
        <Button asChild>
          <a href="/register-business">Cadastrar Meu Negócio</a>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold flex items-center">
          <DollarSign className="h-7 w-7 mr-3" />
          Gestão Financeira
        </h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Registrar Transação Manual</DialogTitle>
            </DialogHeader>
            <TransactionForm businessId={businessId} onSuccess={handleTransactionSuccess} />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Filtro de Período */}
      <div className="flex flex-col gap-4">
        <PeriodFilter range={periodRange} setRange={setPeriodRange} />
        <h2 className="text-xl font-semibold text-gray-700">Resumo do Período: {periodLabel}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Receitas */}
        <Card className="border-l-4 border-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de entradas no período.
            </p>
          </CardContent>
        </Card>
        
        {/* Despesas */}
        <Card className="border-l-4 border-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesa Total</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de saídas no período.
            </p>
          </CardContent>
        </Card>

        {/* Lucro Líquido */}
        <Card className={`border-l-4 ${netProfit >= 0 ? 'border-primary' : 'border-red-700'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-red-700'}`}>{formatCurrency(netProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Resultado do período.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Transações */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhuma transação registrada neste período.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id + t.source}>
                      <TableCell>{format(t.date, 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <div className="font-medium">{t.description}</div>
                        {t.type === 'expense' && t.category && (
                          <div className="text-xs text-muted-foreground">Categoria: {t.category}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {t.source === 'appointment' ? 'Agendamento' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            t.type === 'revenue' ? 'bg-green-100 text-green-700 hover:bg-green-100/80' : 'bg-red-100 text-red-700 hover:bg-red-100/80'
                          )}
                        >
                          {t.type === 'revenue' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-semibold",
                        t.type === 'revenue' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {t.type === 'revenue' ? '+' : '-'} {formatCurrency(t.amount)}
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