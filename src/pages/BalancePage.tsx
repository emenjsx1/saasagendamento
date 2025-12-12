import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/use-business';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Wallet, ArrowDownCircle, ArrowUpCircle, CreditCard, Phone, Mail, Building2, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BusinessBalance {
  id: string;
  business_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  currency: string;
  updated_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  withdrawal_fee: number;
  net_amount: number;
  withdrawal_method: string;
  destination: string;
  status: string;
  created_at: string;
  processed_at: string | null;
}

interface WithdrawalInfo {
  id: string;
  withdrawal_method: string;
  phone_number: string | null;
  email: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  is_active: boolean;
}

const BalancePage: React.FC = () => {
  const { business, businessId } = useBusiness();
  const { T, currentCurrency } = useCurrency();
  const [balance, setBalance] = useState<BusinessBalance | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawalInfo, setWithdrawalInfo] = useState<WithdrawalInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  
  // Estados para formulário de saque
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [selectedWithdrawalMethod, setSelectedWithdrawalMethod] = useState<string>('');
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);
  
  // Estados para formulário de informações
  const [newWithdrawalMethod, setNewWithdrawalMethod] = useState<string>('');
  const [newPhoneNumber, setNewPhoneNumber] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newBankName, setNewBankName] = useState<string>('');
  const [newAccountNumber, setNewAccountNumber] = useState<string>('');
  const [newAccountHolderName, setNewAccountHolderName] = useState<string>('');
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // Carregar dados
  useEffect(() => {
    if (businessId) {
      fetchBalanceData();
    }
  }, [businessId]);

  const fetchBalanceData = async () => {
    if (!businessId) return;
    
    setIsLoading(true);
    try {
      // Buscar saldo
      const { data: balanceData, error: balanceError } = await supabase
        .from('business_balance')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('Erro ao buscar saldo:', balanceError);
      } else {
        setBalance(balanceData || null);
      }

      // Buscar saques
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (withdrawalsError) {
        console.error('Erro ao buscar saques:', withdrawalsError);
      } else {
        setWithdrawals(withdrawalsData || []);
      }

      // Buscar informações de saque
      const { data: infoData, error: infoError } = await supabase
        .from('business_withdrawal_info')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (infoError) {
        console.error('Erro ao buscar informações de saque:', infoError);
      } else {
        setWithdrawalInfo(infoData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error(T('Erro ao carregar dados do saldo.', 'Error loading balance data.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!businessId || !balance) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(T('Valor inválido.', 'Invalid amount.'));
      return;
    }

    if (amount > balance.available_balance) {
      toast.error(T('Saldo insuficiente.', 'Insufficient balance.'));
      return;
    }

    if (!selectedWithdrawalMethod) {
      toast.error(T('Selecione um método de saque.', 'Select a withdrawal method.'));
      return;
    }

    // Verificar se há informação de saque configurada para o método selecionado
    const info = withdrawalInfo.find(i => i.withdrawal_method === selectedWithdrawalMethod);
    if (!info) {
      toast.error(T('Configure as informações de saque primeiro.', 'Configure withdrawal information first.'));
      setIsWithdrawDialogOpen(false);
      setIsInfoDialogOpen(true);
      return;
    }

    // Determinar destino baseado no método
    let destination = '';
    if (selectedWithdrawalMethod === 'mpesa' || selectedWithdrawalMethod === 'emola') {
      destination = info.phone_number || '';
    } else if (selectedWithdrawalMethod === 'bank_transfer') {
      destination = `${info.bank_name} - ${info.account_number} (${info.account_holder_name})`;
    } else if (selectedWithdrawalMethod === 'email') {
      destination = info.email || '';
    }

    if (!destination) {
      toast.error(T('Informações de saque incompletas.', 'Incomplete withdrawal information.'));
      return;
    }

    setIsProcessingWithdrawal(true);
    try {
      const { data, error } = await supabase.rpc('process_withdrawal', {
        p_business_id: businessId,
        p_amount: amount,
        p_withdrawal_method: selectedWithdrawalMethod,
        p_destination: destination,
        p_currency: balance.currency || 'MZN',
        p_notes: null,
      });

      if (error) {
        throw error;
      }

      toast.success(T('Saque solicitado com sucesso!', 'Withdrawal requested successfully!'));
      setIsWithdrawDialogOpen(false);
      setWithdrawAmount('');
      setSelectedWithdrawalMethod('');
      await fetchBalanceData();
    } catch (error: any) {
      console.error('Erro ao processar saque:', error);
      toast.error(error.message || T('Erro ao processar saque.', 'Error processing withdrawal.'));
    } finally {
      setIsProcessingWithdrawal(false);
    }
  };

  const handleSaveWithdrawalInfo = async () => {
    if (!businessId) return;

    if (!newWithdrawalMethod) {
      toast.error(T('Selecione um método de saque.', 'Select a withdrawal method.'));
      return;
    }

    // Validar campos baseado no método
    if ((newWithdrawalMethod === 'mpesa' || newWithdrawalMethod === 'emola') && !newPhoneNumber) {
      toast.error(T('Número de telefone é obrigatório.', 'Phone number is required.'));
      return;
    }

    if (newWithdrawalMethod === 'bank_transfer' && (!newBankName || !newAccountNumber || !newAccountHolderName)) {
      toast.error(T('Preencha todos os dados bancários.', 'Fill in all bank details.'));
      return;
    }

    if (newWithdrawalMethod === 'email' && !newEmail) {
      toast.error(T('Email é obrigatório.', 'Email is required.'));
      return;
    }

    setIsSavingInfo(true);
    try {
      // Desativar informações anteriores do mesmo método
      await supabase
        .from('business_withdrawal_info')
        .update({ is_active: false })
        .eq('business_id', businessId)
        .eq('withdrawal_method', newWithdrawalMethod);

      // Criar nova informação
      const { error: insertError } = await supabase
        .from('business_withdrawal_info')
        .insert({
          business_id: businessId,
          withdrawal_method: newWithdrawalMethod,
          phone_number: newWithdrawalMethod === 'mpesa' || newWithdrawalMethod === 'emola' ? newPhoneNumber : null,
          email: newWithdrawalMethod === 'email' ? newEmail : null,
          bank_name: newWithdrawalMethod === 'bank_transfer' ? newBankName : null,
          account_number: newWithdrawalMethod === 'bank_transfer' ? newAccountNumber : null,
          account_holder_name: newWithdrawalMethod === 'bank_transfer' ? newAccountHolderName : null,
          is_active: true,
        });

      if (insertError) {
        throw insertError;
      }

      toast.success(T('Informações de saque salvas com sucesso!', 'Withdrawal information saved successfully!'));
      setIsInfoDialogOpen(false);
      // Limpar formulário
      setNewWithdrawalMethod('');
      setNewPhoneNumber('');
      setNewEmail('');
      setNewBankName('');
      setNewAccountNumber('');
      setNewAccountHolderName('');
      await fetchBalanceData();
    } catch (error: any) {
      console.error('Erro ao salvar informações:', error);
      toast.error(error.message || T('Erro ao salvar informações.', 'Error saving information.'));
    } finally {
      setIsSavingInfo(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return T('Pendente', 'Pending');
      case 'processing':
        return T('Processando', 'Processing');
      case 'completed':
        return T('Concluído', 'Completed');
      case 'failed':
        return T('Falhou', 'Failed');
      case 'cancelled':
        return T('Cancelado', 'Cancelled');
      default:
        return status;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'mpesa':
        return 'M-Pesa';
      case 'emola':
        return 'e-Mola';
      case 'bank_transfer':
        return T('Transferência Bancária', 'Bank Transfer');
      case 'email':
        return T('Email', 'Email');
      default:
        return method;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const availableBalance = balance?.available_balance || 0;
  const pendingBalance = balance?.pending_balance || 0;
  const totalEarned = balance?.total_earned || 0;
  const totalWithdrawn = balance?.total_withdrawn || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{T('Saldo', 'Balance')}</h1>
        <div className="flex gap-2">
          <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {T('Configurar Saque', 'Configure Withdrawal')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{T('Configurar Informações de Saque', 'Configure Withdrawal Information')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>{T('Método de Saque', 'Withdrawal Method')}</Label>
                  <Select value={newWithdrawalMethod} onValueChange={setNewWithdrawalMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder={T('Selecione o método', 'Select method')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="emola">e-Mola</SelectItem>
                      <SelectItem value="bank_transfer">{T('Transferência Bancária', 'Bank Transfer')}</SelectItem>
                      <SelectItem value="email">{T('Email', 'Email')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(newWithdrawalMethod === 'mpesa' || newWithdrawalMethod === 'emola') && (
                  <div>
                    <Label>{T('Número de Telefone', 'Phone Number')}</Label>
                    <Input
                      type="tel"
                      placeholder="841234567"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                    />
                  </div>
                )}

                {newWithdrawalMethod === 'bank_transfer' && (
                  <>
                    <div>
                      <Label>{T('Nome do Banco', 'Bank Name')}</Label>
                      <Input
                        value={newBankName}
                        onChange={(e) => setNewBankName(e.target.value)}
                        placeholder={T('Ex: Banco de Moçambique', 'Ex: Bank of Mozambique')}
                      />
                    </div>
                    <div>
                      <Label>{T('Número da Conta', 'Account Number')}</Label>
                      <Input
                        value={newAccountNumber}
                        onChange={(e) => setNewAccountNumber(e.target.value)}
                        placeholder="1234567890"
                      />
                    </div>
                    <div>
                      <Label>{T('Nome do Titular', 'Account Holder Name')}</Label>
                      <Input
                        value={newAccountHolderName}
                        onChange={(e) => setNewAccountHolderName(e.target.value)}
                        placeholder={T('Nome completo', 'Full name')}
                      />
                    </div>
                  </>
                )}

                {newWithdrawalMethod === 'email' && (
                  <div>
                    <Label>{T('Email', 'Email')}</Label>
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>
                )}

                <Button
                  onClick={handleSaveWithdrawalInfo}
                  disabled={isSavingInfo}
                  className="w-full"
                >
                  {isSavingInfo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {T('Salvando...', 'Saving...')}
                    </>
                  ) : (
                    T('Salvar', 'Save')
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={availableBalance <= 0}>
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                {T('Sacar', 'Withdraw')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{T('Solicitar Saque', 'Request Withdrawal')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>{T('Valor Disponível', 'Available Balance')}</Label>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(availableBalance, balance?.currency || 'MZN', 'pt-MZ')}
                  </div>
                </div>

                <div>
                  <Label>{T('Valor a Sacar', 'Amount to Withdraw')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={availableBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {T('Taxa de saque: 2%', 'Withdrawal fee: 2%')}
                  </p>
                  {withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <p className="text-xs text-blue-800">
                        <strong>{T('Taxa (2%):', 'Fee (2%):')}</strong> {formatCurrency(parseFloat(withdrawAmount) * 0.02, balance?.currency || 'MZN', 'pt-MZ')}
                      </p>
                      <p className="text-xs text-blue-800">
                        <strong>{T('Valor líquido:', 'Net amount:')}</strong> {formatCurrency(parseFloat(withdrawAmount) * 0.98, balance?.currency || 'MZN', 'pt-MZ')}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label>{T('Método de Saque', 'Withdrawal Method')}</Label>
                  <Select value={selectedWithdrawalMethod} onValueChange={setSelectedWithdrawalMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder={T('Selecione o método', 'Select method')} />
                    </SelectTrigger>
                    <SelectContent>
                      {withdrawalInfo.map((info) => (
                        <SelectItem key={info.id} value={info.withdrawal_method}>
                          {getMethodLabel(info.withdrawal_method)}
                          {info.withdrawal_method === 'mpesa' || info.withdrawal_method === 'emola' ? ` - ${info.phone_number}` : ''}
                          {info.withdrawal_method === 'email' ? ` - ${info.email}` : ''}
                          {info.withdrawal_method === 'bank_transfer' ? ` - ${info.bank_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {withdrawalInfo.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      {T('Configure as informações de saque primeiro.', 'Configure withdrawal information first.')}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={isProcessingWithdrawal || !withdrawAmount || !selectedWithdrawalMethod || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > availableBalance}
                  className="w-full"
                >
                  {isProcessingWithdrawal ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {T('Processando...', 'Processing...')}
                    </>
                  ) : (
                    T('Solicitar Saque', 'Request Withdrawal')
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{T('Saldo Disponível', 'Available Balance')}</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(availableBalance, balance?.currency || 'MZN', 'pt-MZ')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {T('Pronto para saque', 'Ready for withdrawal')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{T('Saldo Pendente', 'Pending Balance')}</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(pendingBalance, balance?.currency || 'MZN', 'pt-MZ')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {T('Aguardando confirmação', 'Awaiting confirmation')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{T('Total Ganho', 'Total Earned')}</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalEarned, balance?.currency || 'MZN', 'pt-MZ')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {T('Histórico completo', 'Complete history')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{T('Total Sacado', 'Total Withdrawn')}</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {formatCurrency(totalWithdrawn, balance?.currency || 'MZN', 'pt-MZ')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {T('Todos os saques', 'All withdrawals')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Informações de Saque Configuradas */}
      {withdrawalInfo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{T('Informações de Saque Configuradas', 'Configured Withdrawal Information')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {withdrawalInfo.map((info) => (
                <div key={info.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {info.withdrawal_method === 'mpesa' || info.withdrawal_method === 'emola' ? (
                      <Phone className="h-5 w-5 text-green-600" />
                    ) : info.withdrawal_method === 'bank_transfer' ? (
                      <Building2 className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Mail className="h-5 w-5 text-purple-600" />
                    )}
                    <div>
                      <p className="font-medium">{getMethodLabel(info.withdrawal_method)}</p>
                      <p className="text-sm text-gray-600">
                        {info.phone_number || info.email || `${info.bank_name} - ${info.account_number}`}
                      </p>
                    </div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Saques */}
      <Card>
        <CardHeader>
          <CardTitle>{T('Histórico de Saques', 'Withdrawal History')}</CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {T('Nenhum saque realizado ainda.', 'No withdrawals made yet.')}
            </p>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(withdrawal.status)}
                    <div>
                      <p className="font-medium">
                        {formatCurrency(withdrawal.amount, balance?.currency || 'MZN', 'pt-MZ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {getMethodLabel(withdrawal.withdrawal_method)} - {withdrawal.destination}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(withdrawal.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      withdrawal.status === 'completed' ? 'text-green-600' :
                      withdrawal.status === 'failed' || withdrawal.status === 'cancelled' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {getStatusLabel(withdrawal.status)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {T('Taxa:', 'Fee:')} {formatCurrency(withdrawal.withdrawal_fee, balance?.currency || 'MZN', 'pt-MZ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {T('Líquido:', 'Net:')} {formatCurrency(withdrawal.net_amount, balance?.currency || 'MZN', 'pt-MZ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informação sobre Taxas */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">{T('Informações sobre Taxas', 'Fee Information')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <p>
            <strong>{T('Taxa de Transação:', 'Transaction Fee:')}</strong> {T('8% é descontado do cliente em cada pagamento (M-Pesa, e-Mola ou Cartão). O valor líquido é adicionado ao seu saldo.', '8% is deducted from the client on each payment (M-Pesa, e-Mola or Card). The net amount is added to your balance.')}
          </p>
          <p>
            <strong>{T('Taxa de Saque:', 'Withdrawal Fee:')}</strong> {T('2% é descontado do valor solicitado em cada saque. O valor líquido será transferido para o método configurado.', '2% is deducted from the requested amount on each withdrawal. The net amount will be transferred to the configured method.')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BalancePage;


