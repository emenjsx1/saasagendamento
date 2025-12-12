/**
 * Payment Callback Page
 * Página de retorno após pagamento via Dodo Payments
 * Verifica o status do pagamento e atualiza a subscription
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { verifyDodoPayment } from '@/utils/dodoPayments';
import { refreshConsolidatedUserData } from '@/utils/user-consolidated-data';
import { useCurrency } from '@/contexts/CurrencyContext';

type PaymentStatus = 'checking' | 'success' | 'failed' | 'pending' | 'error';

const PaymentCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const { T } = useCurrency();
  const [status, setStatus] = useState<PaymentStatus>('checking');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!user) {
        setStatus('error');
        setMessage(T('Você precisa estar logado para verificar o pagamento.', 'You need to be logged in to verify payment.'));
        return;
      }

      // Obter payment_id da URL ou sessionStorage
      const paymentId = searchParams.get('payment_id') || 
                       searchParams.get('paymentId') ||
                       sessionStorage.getItem('dodo_payment_id');

      if (!paymentId) {
        setStatus('error');
        setMessage(T('ID de pagamento não encontrado.', 'Payment ID not found.'));
        return;
      }

      try {
        // Verificar status do pagamento
        const verification = await verifyDodoPayment(paymentId);

        if (verification.success) {
          setStatus('success');
          setMessage(T('Pagamento confirmado! Sua conta foi ativada.', 'Payment confirmed! Your account has been activated.'));

          // Atualizar tabela consolidada
          try {
            await refreshConsolidatedUserData(user.id);
          } catch (error) {
            console.warn('Erro ao atualizar tabela consolidada:', error);
          }

          // Limpar sessionStorage
          sessionStorage.removeItem('dodo_payment_id');
          sessionStorage.removeItem('dodo_payment_reference');
          sessionStorage.removeItem('dodo_payment_amount');
          sessionStorage.removeItem('dodo_payment_currency');

          // Redirecionar para dashboard após 3 segundos
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        } else {
          setStatus('failed');
          setMessage(verification.message || T('Pagamento não confirmado.', 'Payment not confirmed.'));
        }
      } catch (error: any) {
        console.error('Erro ao verificar pagamento:', error);
        setStatus('error');
        setMessage(error.message || T('Erro ao verificar pagamento.', 'Error verifying payment.'));
      }
    };

    verifyPayment();
  }, [user, searchParams, navigate, T]);

  const renderContent = () => {
    switch (status) {
      case 'checking':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-2xl font-bold">{T('Verificando Pagamento...', 'Verifying Payment...')}</h2>
            <p className="text-gray-600">{T('Aguarde enquanto verificamos seu pagamento.', 'Please wait while we verify your payment.')}</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-green-600">{T('Pagamento Confirmado!', 'Payment Confirmed!')}</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500">{T('Redirecionando para o dashboard...', 'Redirecting to dashboard...')}</p>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center space-y-4">
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-red-600">{T('Pagamento Falhou', 'Payment Failed')}</h2>
            <p className="text-gray-600">{message}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/choose-plan')}>
                {T('Tentar Novamente', 'Try Again')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                {T('Ir para Dashboard', 'Go to Dashboard')}
              </Button>
            </div>
          </div>
        );

      case 'pending':
        return (
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto" />
            <h2 className="text-2xl font-bold text-yellow-600">{T('Pagamento Pendente', 'Payment Pending')}</h2>
            <p className="text-gray-600">{T('Seu pagamento está sendo processado. Você receberá uma confirmação por email quando for confirmado.', 'Your payment is being processed. You will receive a confirmation email when it is confirmed.')}</p>
            <Button onClick={() => navigate('/dashboard')}>
              {T('Ir para Dashboard', 'Go to Dashboard')}
            </Button>
          </div>
        );

      case 'error':
      default:
        return (
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-red-600">{T('Erro', 'Error')}</h2>
            <p className="text-gray-600">{message}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/choose-plan')}>
                {T('Voltar para Planos', 'Back to Plans')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                {T('Ir para Dashboard', 'Go to Dashboard')}
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{T('Status do Pagamento', 'Payment Status')}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCallbackPage;


