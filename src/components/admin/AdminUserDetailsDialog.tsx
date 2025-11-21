import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Briefcase, DollarSign, Calendar, CreditCard, Mail, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useUserBusinessPayment } from '@/hooks/use-user-business-payment';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface AdminUserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const AdminUserDetailsDialog: React.FC<AdminUserDetailsDialogProps> = ({
  open,
  onOpenChange,
  userId,
}) => {
  const { T, currentCurrency } = useCurrency();
  const { info, isLoading, error } = useUserBusinessPayment(userId);

  if (!open) return null;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{T('Carregando informações...', 'Loading information...')}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !info) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{T('Erro', 'Error')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-red-600">{error || T('Não foi possível carregar as informações do usuário.', 'Could not load user information.')}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getPaymentStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">N/A</Badge>;
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" /> {T('Confirmado', 'Confirmed')}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" /> {T('Pendente', 'Pending')}</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" /> {T('Falhou', 'Failed')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSubscriptionStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">N/A</Badge>;
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border-green-300">{T('Ativo', 'Active')}</Badge>;
      case 'trial':
        return <Badge variant="secondary">{T('Teste Gratuito', 'Free Trial')}</Badge>;
      case 'pending_payment':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">{T('Pagamento Pendente', 'Pending Payment')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <User className="h-6 w-6" />
            {T('Detalhes do Usuário', 'User Details')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Usuário */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                {T('Informações do Usuário', 'User Information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">{T('Nome:', 'Name:')}</span>
                <span>{info.user_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{info.user_email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">{T('ID:', 'ID:')}</span>
                <span className="text-xs font-mono text-gray-500">{info.user_id}</span>
              </div>
            </CardContent>
          </Card>

          {/* Informações do Negócio */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-purple-600" />
                {T('Negócio Associado', 'Associated Business')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {info.business_id && info.business_name ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">{T('Nome do Negócio:', 'Business Name:')}</span>
                    <span>{info.business_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">{T('ID do Negócio:', 'Business ID:')}</span>
                    <span className="text-xs font-mono text-gray-500">{info.business_id}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">{T('Usuário não possui negócio associado.', 'User does not have an associated business.')}</p>
              )}
            </CardContent>
          </Card>

          {/* Informações de Pagamento */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                {T('Informações de Pagamento', 'Payment Information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {info.payment_id ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">{T('Valor Pago:', 'Amount Paid:')}</span>
                    <span className="text-lg font-bold text-green-600">
                      {info.amount_paid ? formatCurrency(info.amount_paid, currentCurrency.key, currentCurrency.locale) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">{T('Status do Pagamento:', 'Payment Status:')}</span>
                    {getPaymentStatusBadge(info.payment_status)}
                  </div>
                  {info.payment_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {T('Data:', 'Date:')} {format(parseISO(info.payment_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  {info.payment_method && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {T('Método:', 'Method:')} {info.payment_method}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">{T('ID do Pagamento:', 'Payment ID:')}</span>
                    <span className="text-xs font-mono text-gray-500">{info.payment_id}</span>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm">{T('Nenhum pagamento registrado.', 'No payment recorded.')}</p>
              )}
            </CardContent>
          </Card>

          {/* Informações da Assinatura */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                {T('Plano de Assinatura', 'Subscription Plan')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {info.subscription_id ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">{T('Plano Ativo:', 'Active Plan:')}</span>
                    <Badge variant="outline" className="text-sm">{info.plan_name || 'N/A'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">{T('Status da Assinatura:', 'Subscription Status:')}</span>
                    {getSubscriptionStatusBadge(info.subscription_status)}
                  </div>
                  {info.subscription_renewal_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {T('Data de Renovação:', 'Renewal Date:')} {format(parseISO(info.subscription_renewal_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  {info.trial_ends_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {T('Teste expira em:', 'Trial expires on:')} {format(parseISO(info.trial_ends_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">{T('ID da Assinatura:', 'Subscription ID:')}</span>
                    <span className="text-xs font-mono text-gray-500">{info.subscription_id}</span>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm">{T('Nenhuma assinatura registrada.', 'No subscription recorded.')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminUserDetailsDialog;


