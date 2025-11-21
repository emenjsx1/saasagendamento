import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Loader2, Search, CheckCircle, XCircle, MoreHorizontal, CreditCard, User, Briefcase, TrendingUp } from 'lucide-react';
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
import { getConsolidatedUsersData } from '@/utils/user-consolidated-data';

type PaymentStatus = 'pending' | 'confirmed' | 'failed';
type PaymentType = 'subscription' | 'service' | 'manual';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  status: PaymentStatus;
  payment_type: PaymentType;
  method: string;
  transaction_id: string | null;
  notes: string | null;
  user_id: string;
  business_id: string | null;
  profiles: { id: string, first_name: string, last_name: string, email: string } | null;
  businesses: { name: string } | null;
  subscription: { plan_name: string, status: string, trial_ends_at?: string } | null;
}

const statusMap: Record<PaymentStatus, { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success', color: string }> = {
  pending: { label: 'Pendente', variant: 'secondary', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  confirmed: { label: 'Confirmado', variant: 'success', color: 'bg-green-100 text-green-700 border-green-300' },
  failed: { label: 'Falhou', variant: 'destructive', color: 'bg-red-100 text-red-700 border-red-300' },
};

const typeMap: Record<PaymentType, string> = {
  subscription: 'Assinatura',
  service: 'Serviço',
  manual: 'Manual',
};

const AdminPaymentsPage: React.FC = () => {
  const { T, currentCurrency } = useCurrency();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<PaymentType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);

    try {
      // ============================================
      // 1. BUSCAR PAGAMENTOS
      // ============================================
    let query = supabase
      .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

    // Aplicar filtros
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }
    if (filterType !== 'all') {
      query = query.eq('payment_type', filterType);
    }
    
      // Aplicar filtro de busca
    if (searchTerm) {
        query = query.or(`transaction_id.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
    }

    const { data: paymentsData, error: paymentsError } = await query;

    if (paymentsError) {
        toast.error(T("Erro ao carregar pagamentos.", "Error loading payments."));
        console.error('❌ Erro ao buscar pagamentos:', paymentsError);
        setPayments([]);
        setIsLoading(false);
        return;
      }

      if (!paymentsData || paymentsData.length === 0) {
        setPayments([]);
        setTotalRevenue(0);
        setIsLoading(false);
        return;
      }

      console.log('✅ Pagamentos encontrados:', paymentsData.length);

      // ============================================
      // 2. EXTRAIR TODOS OS USER_IDS
      // ============================================
      const userIds = [...new Set(paymentsData.map((p: any) => p.user_id).filter(Boolean))];
      console.log('👥 User IDs únicos para buscar:', userIds.length, userIds);

      // ============================================
      // 3. BUSCAR DADOS CONSOLIDADOS DE TODOS OS USUÁRIOS
      // Usa a função consolidada que busca tudo de uma vez
      // ============================================
      const consolidatedUsersMap = await getConsolidatedUsersData(userIds);
      console.log(`✅ Dados consolidados carregados para ${consolidatedUsersMap.size} usuários`);

      // ============================================
      // 4. BUSCAR NEGÓCIOS (OPCIONAL - para business_id dos pagamentos)
      // ============================================
      const businessIds = [...new Set(paymentsData.map((p: any) => p.business_id).filter(Boolean))];
      let businessesData: any[] = [];
      
      if (businessIds.length > 0) {
        const { data, error: businessesError } = await supabase
          .from('businesses')
          .select('id, name')
          .in('id', businessIds);

        if (businessesError) {
          console.error('❌ Erro ao buscar negócios:', businessesError);
        } else {
          businessesData = data || [];
        }
      }

      const businessesMap = new Map(
        businessesData.map((b: any) => [b.id, b])
      );

      // ============================================
      // 5. MONTAR RESPOSTA FINAL
      // ============================================
      const mappedPayments = paymentsData.map((payment: any) => {
        // Buscar dados consolidados do usuário
        const userData = consolidatedUsersMap.get(payment.user_id);
        
        // Buscar negócio (se houver business_id no pagamento)
        const business = payment.business_id ? (businessesMap.get(payment.business_id) || null) : null;

        // Construir nome do usuário
        let userName = 'Não encontrado';
        if (userData) {
          const firstName = userData.first_name || '';
          const lastName = userData.last_name || '';
          userName = `${firstName} ${lastName}`.trim() || userData.email || 'Sem nome';
        }

        // Construir nome do plano
        // 1. Tentar pegar da subscription consolidada (CORRETO)
        // 2. Se não houver, usar fallback das notes
        let planName = 'Plano desconhecido';
        if (userData?.plan_name) {
          planName = userData.plan_name;
        } else if (payment.notes) {
          // Fallback: tentar extrair das notes
          const notesMatch = payment.notes.match(/assinatura\s+([^,\s]+)/i);
          if (notesMatch) {
            planName = notesMatch[1];
    } else {
            planName = payment.notes.substring(0, 30);
          }
        }

        return {
          ...payment,
          amount: parseFloat(payment.amount as any),
          profiles: userData ? {
            id: userData.user_id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
          } : null,
          businesses: business ? { name: business.name } : null,
          subscription: userData?.plan_name ? {
            plan_name: userData.plan_name,
            status: userData.subscription_status,
            trial_ends_at: userData.trial_ends_at,
          } : null,
        };
      }) as Payment[];
      
      setPayments(mappedPayments);
      
      // Calcular receita total (apenas confirmados)
      const confirmedTotal = mappedPayments
        .filter(p => p.status === 'confirmed')
        .reduce((sum, p) => sum + p.amount, 0);
      setTotalRevenue(confirmedTotal);

      console.log('✅ Mapeamento concluído:', {
        totalPayments: mappedPayments.length,
        withProfile: mappedPayments.filter(p => p.profiles).length,
        withSubscription: mappedPayments.filter(p => p.subscription).length,
        totalRevenue: confirmedTotal,
      });

    } catch (error: any) {
      console.error('❌ Erro ao buscar pagamentos:', error);
      toast.error(T("Erro ao carregar pagamentos.", "Error loading payments."));
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterType, searchTerm, refreshKey, T]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const updatePaymentStatus = async (payment: Payment, newStatus: PaymentStatus) => {
    const loadingToastId = toast.loading(T(`Atualizando status para ${statusMap[newStatus].label}...`, `Updating status to ${statusMap[newStatus].label}...`));
    
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: newStatus })
        .eq('id', payment.id);

      if (error) throw error;
      
      // Se o pagamento for confirmado e for de assinatura, atualiza a subscrição
      if (newStatus === 'confirmed' && payment.payment_type === 'subscription') {
          const { error: subError } = await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('user_id', payment.user_id);
            
        if (subError) {
          console.error("Erro ao atualizar subscrição:", subError);
        }
      }

      // Força a atualização da lista
      setRefreshKey(prev => prev + 1); 
      toast.success(T(`Pagamento atualizado para ${statusMap[newStatus].label}.`, `Payment updated to ${statusMap[newStatus].label}.`), { id: loadingToastId });
      
    } catch (error: any) {
      toast.error(T(`Erro ao atualizar status: ${error.message}`, `Error updating status: ${error.message}`), { id: loadingToastId });
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
            {T('Gestão Financeira', 'Financial Management')}
      </h1>
          <p className="text-gray-600 mt-2">{T('Monitore todas as transações financeiras da plataforma', 'Monitor all platform financial transactions')}</p>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">{T('Receita Total Confirmada', 'Total Confirmed Revenue')}</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(totalRevenue, currentCurrency.key, currentCurrency.locale)}
            </div>
            <p className="text-xs text-gray-600 mt-1">{T('Apenas pagamentos confirmados', 'Only confirmed payments')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">{T('Total de Transações', 'Total Transactions')}</CardTitle>
            <CreditCard className="h-5 w-5 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{payments.length}</div>
            <p className="text-xs text-gray-600 mt-1">{T('Todas as transações', 'All transactions')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">{T('Pagamentos Confirmados', 'Confirmed Payments')}</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {payments.filter(p => p.status === 'confirmed').length}
            </div>
            <p className="text-xs text-gray-600 mt-1">{T('Status: Confirmado', 'Status: Confirmed')}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters and Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{T('Histórico de Transações', 'Transaction History')} ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mb-6">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={T("Buscar por ID de Transação ou Notas...", "Search by Transaction ID or Notes...")}
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
                onValueChange={(value: PaymentStatus | 'all') => {
                  if (value) setFilterStatus(value);
                }}
                className="flex flex-wrap justify-start"
              >
                <ToggleGroupItem value="all" aria-label={T('Todos', 'All')} className="h-9 text-xs">
                  {T('Todos', 'All')}
                </ToggleGroupItem>
                <ToggleGroupItem value="confirmed" aria-label={T('Confirmado', 'Confirmed')} className="h-9 text-xs">
                  {T('Confirmado', 'Confirmed')}
                </ToggleGroupItem>
                <ToggleGroupItem value="pending" aria-label={T('Pendente', 'Pending')} className="h-9 text-xs">
                  {T('Pendente', 'Pending')}
                </ToggleGroupItem>
              </ToggleGroup>
              
              {/* Filtro por Tipo */}
              <ToggleGroup 
                type="single" 
                value={filterType} 
                onValueChange={(value: PaymentType | 'all') => {
                  if (value) setFilterType(value);
                }}
                className="flex flex-wrap justify-start"
              >
                <ToggleGroupItem value="all" aria-label={T('Todos Tipos', 'All Types')} className="h-9 text-xs">
                  {T('Todos Tipos', 'All Types')}
                </ToggleGroupItem>
                <ToggleGroupItem value="subscription" aria-label={T('Assinatura', 'Subscription')} className="h-9 text-xs">
                  {T('Assinatura', 'Subscription')}
                </ToggleGroupItem>
                <ToggleGroupItem value="service" aria-label={T('Serviço', 'Service')} className="h-9 text-xs">
                  {T('Serviço', 'Service')}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{T('Nenhuma transação encontrada com os filtros selecionados.', 'No transactions found with selected filters.')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{T('Data', 'Date')}</TableHead>
                    <TableHead>{T('Valor', 'Amount')}</TableHead>
                    <TableHead>{T('Tipo', 'Type')}</TableHead>
                    <TableHead>{T('Método', 'Method')}</TableHead>
                    <TableHead>{T('Status', 'Status')}</TableHead>
                    <TableHead>{T('Usuário', 'User')}</TableHead>
                    <TableHead>{T('Plano Ativo', 'Active Plan')}</TableHead>
                    <TableHead>{T('Negócio', 'Business')}</TableHead>
                    <TableHead>{T('Transação', 'Transaction')}</TableHead>
                    <TableHead className="text-right">{T('Ações', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => {
                    const statusInfo = statusMap[p.status] || statusMap.pending;
                    const paymentDate = parseISO(p.payment_date);
                    
                    // Construir nome do usuário
                    let userName = 'Não encontrado';
                    let userEmail = null;
                    if (p.profiles) {
                      const firstName = p.profiles.first_name || '';
                      const lastName = p.profiles.last_name || '';
                      userName = `${firstName} ${lastName}`.trim() || p.profiles.email || 'Sem nome';
                      userEmail = p.profiles.email || null;
                    }
                    
                    // Construir nome do plano
                    let planName = 'Plano desconhecido';
                    let planStatus = null;
                    if (p.subscription?.plan_name) {
                      planName = p.subscription.plan_name;
                      planStatus = p.subscription.status;
                    } else if (p.notes) {
                      // Fallback: tentar extrair das notes
                      const notesMatch = p.notes.match(/assinatura\s+([^,\s]+)/i);
                      if (notesMatch) {
                        planName = notesMatch[1];
                      } else {
                        planName = p.notes.substring(0, 30);
                      }
                    }
                    
                    const businessName = p.businesses?.name || null;

                    return (
                      <TableRow key={p.id} className="hover:bg-gray-50">
                        <TableCell className="text-sm">
                          <div>
                            <p className="font-medium">{format(paymentDate, 'dd/MM/yyyy', { locale: ptBR })}</p>
                            <p className="text-xs text-gray-500">{format(paymentDate, 'HH:mm', { locale: ptBR })}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(p.amount, currentCurrency.key, currentCurrency.locale)}
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className="text-xs">{typeMap[p.payment_type] || p.payment_type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{p.method}</TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {p.profiles ? (
                              <>
                                <div className="flex items-center gap-1 text-gray-900 font-medium">
                                  <User className="h-3 w-3 text-gray-400" /> {userName}
                                </div>
                                {userEmail && (
                                  <p className="text-xs text-gray-500 mt-1">{userEmail}</p>
                                )}
                              </>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-gray-400 italic">Usuário não encontrado</span>
                                <span className="text-xs font-mono text-gray-500" title={p.user_id}>
                                  ID: {p.user_id.substring(0, 8)}...
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {p.subscription ? (
                            <div>
                              <Badge variant="outline" className="text-xs">
                                {planName}
                              </Badge>
                              {planStatus && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {planStatus === 'active' ? T('Ativo', 'Active') : 
                                   planStatus === 'trial' ? T('Teste', 'Trial') : 
                                   planStatus === 'pending_payment' ? T('Pendente', 'Pending') : 
                                   planStatus}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              {planName !== 'Plano desconhecido' ? (
                                <Badge variant="outline" className="text-xs">
                                  {planName}
                                </Badge>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.business_id ? (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Briefcase className="h-3 w-3 text-gray-400" /> {businessName || '-'}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-mono text-gray-600 truncate max-w-[150px]" title={p.transaction_id || 'N/A'}>
                            {p.transaction_id || 'N/A'}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">{T('Abrir menu', 'Open menu')}</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{T('Ações', 'Actions')}</DropdownMenuLabel>
                              {p.status !== 'confirmed' && (
                                <DropdownMenuItem onClick={() => updatePaymentStatus(p, 'confirmed')}>
                                  <CheckCircle className="h-4 w-4 mr-2" /> {T('Marcar como Confirmado', 'Mark as Confirmed')}
                                </DropdownMenuItem>
                              )}
                              {p.status !== 'failed' && (
                                <DropdownMenuItem onClick={() => updatePaymentStatus(p, 'failed')}>
                                  <XCircle className="h-4 w-4 mr-2" /> {T('Marcar como Falhou', 'Mark as Failed')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled>
                                {T('Ver Detalhes', 'View Details')} ({p.transaction_id || 'N/A'})
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
    </div>
  );
};

export default AdminPaymentsPage;
