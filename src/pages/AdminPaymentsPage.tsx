import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Loader2, Search, Filter, CheckCircle, XCircle, MoreHorizontal, CreditCard, User, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCurrency } from '@/contexts/CurrencyContext';

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
  profiles: { first_name: string, last_name: string } | null;
  businesses: { name: string } | null;
}

const statusMap: Record<PaymentStatus, { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'success' },
  failed: { label: 'Falhou', variant: 'destructive' },
};

const typeMap: Record<PaymentType, string> = {
  subscription: 'Assinatura',
  service: 'Serviço',
  manual: 'Manual',
};

const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<PaymentType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const { currentCurrency } = useCurrency();

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);

    let query = supabase
      .from('payments')
      .select(`
        *,
        profiles (first_name, last_name),
        businesses (name)
      `);

    // Aplicar filtros
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }
    if (filterType !== 'all') {
      query = query.eq('payment_type', filterType);
    }
    
    // Aplicar filtro de busca (por transaction_id ou notes)
    if (searchTerm) {
        query = query.or(`transaction_id.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
    }

    // Ordenar por data de pagamento
    query = query.order('payment_date', { ascending: false });

    const { data: paymentsData, error: paymentsError } = await query;

    if (paymentsError) {
      toast.error("Erro ao carregar pagamentos.");
      console.error(paymentsError);
    } else {
      const mappedPayments = (paymentsData || []).map(p => ({
          ...p,
          amount: parseFloat(p.amount as any),
          profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
          businesses: Array.isArray(p.businesses) ? p.businesses[0] : p.businesses,
      })) as Payment[];
      
      setPayments(mappedPayments);
    }
    setIsLoading(false);
  }, [filterStatus, filterType, searchTerm, refreshKey]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const updatePaymentStatus = async (payment: Payment, newStatus: PaymentStatus) => {
    const loadingToastId = toast.loading(`Atualizando status para ${statusMap[newStatus].label}...`);
    
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
            
          if (subError) console.error("Erro ao atualizar subscrição:", subError);
      }

      // Força a atualização da lista
      setRefreshKey(prev => prev + 1); 
      toast.success(`Pagamento atualizado para ${statusMap[newStatus].label}.`, { id: loadingToastId });
      
    } catch (error: any) {
      toast.error(`Erro ao atualizar status: ${error.message}`, { id: loadingToastId });
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center text-red-600">
        <DollarSign className="h-7 w-7 mr-3" />
        Gestão Financeira da Plataforma
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID de Transação ou Notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              
              {/* Filtro por Status */}
              <ToggleGroup 
                type="single" 
                value={filterStatus} 
                onValueChange={(value: PaymentStatus | 'all') => {
                  if (value) setFilterStatus(value);
                }}
                className="flex flex-wrap justify-start"
              >
                <ToggleGroupItem value="all" aria-label="Todos" className="h-8 text-xs">
                  Todos
                </ToggleGroupItem>
                <ToggleGroupItem value="confirmed" aria-label="Confirmado" className="h-8 text-xs">
                  Confirmado
                </ToggleGroupItem>
                <ToggleGroupItem value="pending" aria-label="Pendente" className="h-8 text-xs">
                  Pendente
                </ToggleGroupItem>
              </ToggleGroup>
              
              {/* Filtro por Tipo */}
              <ToggleGroup 
                type="single" 
                value={filterType} 
                onValueChange={(value: PaymentType | 'all') => {
                  if (value) setFilterType(value);
                }}
                className="flex flex-wrap justify-start ml-4"
              >
                <ToggleGroupItem value="all" aria-label="Todos Tipos" className="h-8 text-xs">
                  Todos Tipos
                </ToggleGroupItem>
                <ToggleGroupItem value="subscription" aria-label="Assinatura" className="h-8 text-xs">
                  Assinatura
                </ToggleGroupItem>
                <ToggleGroupItem value="service" aria-label="Serviço" className="h-8 text-xs">
                  Serviço
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhuma transação encontrada com os filtros selecionados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usuário/Negócio</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => {
                    const statusInfo = statusMap[p.status] || statusMap.pending;
                    const paymentDate = parseISO(p.payment_date);
                    const userName = p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}` : 'N/A';
                    const businessName = p.businesses?.name || 'N/A';

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{format(paymentDate, 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell className="font-bold text-green-600">{formatCurrency(p.amount, currentCurrency.key, currentCurrency.locale)}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className="text-xs">{typeMap[p.payment_type] || p.payment_type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{p.method}</TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center"><User className="h-3 w-3 mr-1" /> {userName}</div>
                            {p.business_id && <div className="flex items-center"><Briefcase className="h-3 w-3 mr-1" /> {businessName}</div>}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              {p.status !== 'confirmed' && (
                                <DropdownMenuItem onClick={() => updatePaymentStatus(p, 'confirmed')}>
                                  <CheckCircle className="h-4 w-4 mr-2" /> Marcar como Confirmado
                                </DropdownMenuItem>
                              )}
                              {p.status !== 'failed' && (
                                <DropdownMenuItem onClick={() => updatePaymentStatus(p, 'failed')}>
                                  <XCircle className="h-4 w-4 mr-2" /> Marcar como Falhou
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled>
                                Ver Detalhes ({p.transaction_id || 'N/A'})
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