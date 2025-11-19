import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ArrowUp, ArrowDown, Loader2, Plus } from 'lucide-react';
import { useBusiness } from '@/hooks/use-business';
import { useFinanceSummary } from '@/hooks/use-finance-summary';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import TransactionForm from '@/components/TransactionForm'; // Novo componente

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const FinancePage: React.FC = () => {
  const { businessId, isLoading: isBusinessLoading } = useBusiness();
  const { totalRevenue, totalExpense, netProfit, isLoading: isSummaryLoading } = useFinanceSummary(businessId);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isLoading = isBusinessLoading || isSummaryLoading;
  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: ptBR });

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
      <div className="flex justify-between items-center">
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
              <DialogTitle>Registrar Transação</DialogTitle>
            </DialogHeader>
            <TransactionForm businessId={businessId} onSuccess={() => setIsModalOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      
      <h2 className="text-xl font-semibold text-gray-700">Resumo de {currentMonth}</h2>

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
              Total de entradas no mês.
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
              Total de saídas no mês.
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
              Resultado do mês.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Transações (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">A listagem detalhada das transações será implementada em seguida.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancePage;