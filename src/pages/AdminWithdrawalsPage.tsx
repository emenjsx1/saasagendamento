import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, Loader2, Search, CheckCircle, XCircle, MoreHorizontal, Briefcase, TrendingDown, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

interface Withdrawal {
  id: string;
  business_id: string;
  amount: number;
  withdrawal_fee: number;
  net_amount: number;
  withdrawal_method: string;
  destination: string;
  status: WithdrawalStatus;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  businesses: { name: string; slug: string } | null;
}

const statusMap: Record<WithdrawalStatus, { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success', color: string }> = {
  pending: { label: 'Pendente', variant: 'secondary', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  approved: { label: 'Aprovado', variant: 'success', color: 'bg-green-100 text-green-700 border-green-300' },
  rejected: { label: 'Rejeitado', variant: 'destructive', color: 'bg-red-100 text-red-700 border-red-300' },
};

const methodMap: Record<string, string> = {
  mpesa: 'M-Pesa',
  emola: 'e-Mola',
  bank_transfer: 'Transferência Bancária',
  email: 'Email/PayPal',
};

const AdminWithdrawalsPage: React.FC = () => {
  const { T, currentCurrency } = useCurrency();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<WithdrawalStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalApproved, setTotalApproved] = useState(0);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    setIsLoading(true);

    try {
      let query = supabase
        .from('withdrawals')
        .select(`
          *,
          businesses (
            id,
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      // Aplicar filtro de busca
      if (searchTerm) {
        query = query.or(`destination.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
      }

      const { data: withdrawalsData, error: withdrawalsError } = await query;

      if (withdrawalsError) {
        toast.error(T("Erro ao carregar saques.", "Error loading withdrawals."));
        console.error('❌ Erro ao buscar saques:', withdrawalsError);
        setWithdrawals([]);
        setIsLoading(false);
        return;
      }

      if (!withdrawalsData || withdrawalsData.length === 0) {
        setWithdrawals([]);
        setTotalPending(0);
        setTotalApproved(0);
        setIsLoading(false);
        return;
      }

      const mappedWithdrawals = withdrawalsData.map((w: any) => ({
        ...w,
        amount: parseFloat(w.amount),
        withdrawal_fee: parseFloat(w.withdrawal_fee),
        net_amount: parseFloat(w.net_amount),
        businesses: w.businesses || null,
      })) as Withdrawal[];

      setWithdrawals(mappedWithdrawals);
      
      // Calcular totais
      const pendingTotal = mappedWithdrawals
        .filter(w => w.status === 'pending')
        .reduce((sum, w) => sum + w.amount, 0);
      setTotalPending(pendingTotal);

      const approvedTotal = mappedWithdrawals
        .filter(w => w.status === 'approved')
        .reduce((sum, w) => sum + w.amount, 0);
      setTotalApproved(approvedTotal);

    } catch (error: any) {
      console.error('❌ Erro ao buscar saques:', error);
      toast.error(T("Erro ao carregar saques.", "Error loading withdrawals."));
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, searchTerm, refreshKey, T]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleUpdateStatus = async (withdrawal: Withdrawal, newStatus: WithdrawalStatus) => {
    setIsProcessing(true);
    
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', withdrawal.id);

      if (error) throw error;

      // Se rejeitado, restaurar o saldo disponível (o valor foi deduzido quando o saque foi criado)
      if (newStatus === 'rejected') {
        const { data: balanceData, error: balanceFetchError } = await supabase
          .from('business_balance')
          .select('available_balance, total_withdrawn')
          .eq('business_id', withdrawal.business_id)
          .single();

        if (!balanceFetchError && balanceData) {
          const newAvailableBalance = (parseFloat(balanceData.available_balance || '0') + withdrawal.amount);
          const newTotalWithdrawn = Math.max(0, (parseFloat(balanceData.total_withdrawn || '0') - withdrawal.amount));
          
          const { error: balanceUpdateError } = await supabase
            .from('business_balance')
            .update({ 
              available_balance: newAvailableBalance,
              total_withdrawn: newTotalWithdrawn,
              updated_at: new Date().toISOString(),
            })
            .eq('business_id', withdrawal.business_id);

          if (balanceUpdateError) {
            console.warn('⚠️ Erro ao restaurar saldo do negócio:', balanceUpdateError);
          }
        }
      }
      // Se aprovado, o saldo já foi deduzido quando o saque foi criado, apenas atualizamos o status

      toast.success(T(`Saque ${newStatus === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso!`, `Withdrawal ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully!`));
      setShowActionDialog(false);
      setSelectedWithdrawal(null);
      setActionType(null);
      setRefreshKey(prev => prev + 1);
      
    } catch (error: any) {
      toast.error(T(`Erro ao atualizar status: ${error.message}`, `Error updating status: ${error.message}`));
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openActionDialog = (withdrawal: Withdrawal, action: 'approve' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setActionType(action);
    setShowActionDialog(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Wallet className="h-7 w-7 text-white" />
            </div>
            {T('Gestão de Saques', 'Withdrawals Management')}
          </h1>
          <p className="text-gray-600 mt-2">{T('Gerencie todos os saques solicitados pelos negócios', 'Manage all withdrawal requests from businesses')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">{T('Saques Pendentes', 'Pending Withdrawals')}</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {formatCurrency(totalPending, currentCurrency.key, currentCurrency.locale)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {withdrawals.filter(w => w.status === 'pending').length} {T('solicitações', 'requests')}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">{T('Total Aprovado', 'Total Approved')}</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(totalApproved, currentCurrency.key, currentCurrency.locale)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {withdrawals.filter(w => w.status === 'approved').length} {T('saques', 'withdrawals')}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">{T('Total de Saques', 'Total Withdrawals')}</CardTitle>
            <TrendingDown className="h-5 w-5 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{withdrawals.length}</div>
            <p className="text-xs text-gray-600 mt-1">{T('Todos os saques', 'All withdrawals')}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters and Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{T('Histórico de Saques', 'Withdrawals History')} ({withdrawals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mb-6">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={T("Buscar por destino ou notas...", "Search by destination or notes...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro por Status */}
              <ToggleGroup 
                type="single" 
                value={filterStatus} 
                onValueChange={(value: WithdrawalStatus | 'all') => {
                  if (value) setFilterStatus(value);
                }}
                className="flex flex-wrap justify-start"
              >
                <ToggleGroupItem value="all" aria-label={T('Todos', 'All')} className="h-9 text-xs">
                  {T('Todos', 'All')}
                </ToggleGroupItem>
                <ToggleGroupItem value="pending" aria-label={T('Pendente', 'Pending')} className="h-9 text-xs">
                  {T('Pendente', 'Pending')}
                </ToggleGroupItem>
                <ToggleGroupItem value="approved" aria-label={T('Aprovado', 'Approved')} className="h-9 text-xs">
                  {T('Aprovado', 'Approved')}
                </ToggleGroupItem>
                <ToggleGroupItem value="rejected" aria-label={T('Rejeitado', 'Rejected')} className="h-9 text-xs">
                  {T('Rejeitado', 'Rejected')}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{T('Nenhum saque encontrado com os filtros selecionados.', 'No withdrawals found with selected filters.')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{T('Data', 'Date')}</TableHead>
                    <TableHead>{T('Negócio', 'Business')}</TableHead>
                    <TableHead>{T('Valor', 'Amount')}</TableHead>
                    <TableHead>{T('Taxa (2%)', 'Fee (2%)')}</TableHead>
                    <TableHead>{T('Valor Líquido', 'Net Amount')}</TableHead>
                    <TableHead>{T('Método', 'Method')}</TableHead>
                    <TableHead>{T('Destino', 'Destination')}</TableHead>
                    <TableHead>{T('Status', 'Status')}</TableHead>
                    <TableHead className="text-right">{T('Ações', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => {
                    const statusInfo = statusMap[w.status] || statusMap.pending;
                    const withdrawalDate = parseISO(w.created_at);
                    
                    return (
                      <TableRow key={w.id} className="hover:bg-gray-50">
                        <TableCell className="text-sm">
                          <div>
                            <p className="font-medium">{format(withdrawalDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
                            <p className="text-xs text-gray-500">{format(withdrawalDate, 'HH:mm', { locale: ptBR })}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {w.businesses ? (
                            <div className="flex items-center gap-1 text-sm text-gray-900 font-medium">
                              <Briefcase className="h-3 w-3 text-gray-400" /> {w.businesses.name}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-orange-600">
                          {formatCurrency(w.amount, w.currency || currentCurrency.key, currentCurrency.locale)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatCurrency(w.withdrawal_fee, w.currency || currentCurrency.key, currentCurrency.locale)}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(w.net_amount, w.currency || currentCurrency.key, currentCurrency.locale)}
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {methodMap[w.withdrawal_method] || w.withdrawal_method}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-700 truncate max-w-[200px]" title={w.destination}>
                            {w.destination}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {w.status === 'pending' ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">{T('Abrir menu', 'Open menu')}</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{T('Ações', 'Actions')}</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openActionDialog(w, 'approve')}>
                                  <CheckCircle className="h-4 w-4 mr-2" /> {T('Aprovar Saque', 'Approve Withdrawal')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openActionDialog(w, 'reject')}>
                                  <XCircle className="h-4 w-4 mr-2" /> {T('Rejeitar Saque', 'Reject Withdrawal')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {w.notes && (
                                  <DropdownMenuItem disabled>
                                    <AlertCircle className="h-4 w-4 mr-2" /> {T('Notas:', 'Notes:')} {w.notes.substring(0, 30)}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? T('Aprovar Saque', 'Approve Withdrawal') : T('Rejeitar Saque', 'Reject Withdrawal')}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? T('Tem certeza que deseja aprovar este saque? O valor será debitado do saldo do negócio.', 'Are you sure you want to approve this withdrawal? The amount will be deducted from the business balance.')
                : T('Tem certeza que deseja rejeitar este saque? O saldo do negócio será restaurado.', 'Are you sure you want to reject this withdrawal? The business balance will be restored.')
              }
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{T('Negócio:', 'Business:')}</p>
                  <p className="font-semibold">{selectedWithdrawal.businesses?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{T('Valor:', 'Amount:')}</p>
                  <p className="font-semibold text-orange-600">
                    {formatCurrency(selectedWithdrawal.amount, selectedWithdrawal.currency || currentCurrency.key, currentCurrency.locale)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{T('Método:', 'Method:')}</p>
                  <p className="font-semibold">{methodMap[selectedWithdrawal.withdrawal_method] || selectedWithdrawal.withdrawal_method}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{T('Destino:', 'Destination:')}</p>
                  <p className="font-semibold">{selectedWithdrawal.destination}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)} disabled={isProcessing}>
              {T('Cancelar', 'Cancel')}
            </Button>
            <Button 
              onClick={() => selectedWithdrawal && handleUpdateStatus(selectedWithdrawal, actionType === 'approve' ? 'approved' : 'rejected')}
              disabled={isProcessing}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {T('Processando...', 'Processing...')}
                </>
              ) : (
                <>
                  {actionType === 'approve' ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" /> {T('Aprovar', 'Approve')}
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" /> {T('Rejeitar', 'Reject')}
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWithdrawalsPage;

