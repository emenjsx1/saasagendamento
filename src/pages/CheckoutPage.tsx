import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Phone, MapPin, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { getPlanBySlug, PricingPlan, generatePricingPlans } from '@/utils/pricing-plans';
import { formatCurrency, cn } from '@/lib/utils';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePublicSettings } from '@/hooks/use-public-settings';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { processPaymentApi, validatePhoneNumber } from '@/utils/paymentApi';
import { processDodoPayment } from '@/utils/dodoPayments';
import { useEmailNotifications } from '@/hooks/use-email-notifications';
import { refreshConsolidatedUserData } from '@/utils/user-consolidated-data';
import { ensureBusinessAccount } from '@/utils/business-helpers';

// Schema de validação para informações de cobrança
const BillingInfoSchema = z.object({
  address: z.string().min(1, "Endereço é obrigatório."),
  phone: z.string().min(5, "Telefone é obrigatório."),
});

type BillingInfoFormValues = z.infer<typeof BillingInfoSchema>;

// Períodos de pagamento disponíveis
const BILLING_PERIODS = [
  { months: 1, label: '1 mês' },
  { months: 3, label: '3 meses' },
  { months: 6, label: '6 meses' },
  { months: 12, label: '12 meses' },
] as const;

// Métodos de pagamento
interface PaymentMethod {
  key: 'mpesa' | 'emola' | 'card';
  name: string;
  icon: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    key: 'mpesa',
    name: 'M-Pesa',
    icon: 'https://idolo.co.mz/wp-content/uploads/2024/07/MPESA.png',
  },
  {
    key: 'emola',
    name: 'e-Mola',
    icon: 'https://play-lh.googleusercontent.com/2TGAhJ55tiyhCwW0ZM43deGv4lUTFTBMoq83mnAO6-bU5hi2NPyKX8BN8iKt13irK7Y=w240-h480-rw',
  },
  {
    key: 'card',
    name: 'Cartão de Crédito/Débito',
    icon: 'https://cdn-icons-png.flaticon.com/512/349/349221.png',
  },
];

const CheckoutPage: React.FC = () => {
  const { planSlug } = useParams<{ planSlug: string }>();
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  const { subscriptionConfig, isLoading: isConfigLoading } = usePublicSettings();
  const { currentCurrency, T } = useCurrency();
  const { sendEmail } = useEmailNotifications();

  // Estados
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<1 | 3 | 6 | 12>(1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mpesa' | 'emola' | 'card' | null>(null);
  const [paymentPhone, setPaymentPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');

  const form = useForm<BillingInfoFormValues>({
    resolver: zodResolver(BillingInfoSchema),
    defaultValues: {
      address: '',
      phone: '',
    },
  });

  // Gerar planos e encontrar o plano selecionado
  const pricingPlans = useMemo(() => {
    return subscriptionConfig ? generatePricingPlans(subscriptionConfig, currentCurrency) : [];
  }, [subscriptionConfig, currentCurrency]);

  // Encontrar plano pelo slug
  useEffect(() => {
    if (!planSlug || !subscriptionConfig || pricingPlans.length === 0) return;

    const plan = getPlanBySlug(planSlug, pricingPlans);
    if (plan) {
      setSelectedPlan(plan);
    } else {
      toast.error(T('Plano não encontrado.', 'Plan not found.'));
      navigate('/choose-plan', { replace: true });
    }
  }, [planSlug, subscriptionConfig, pricingPlans, navigate, T]);

  // Carregar dados do perfil se usuário está logado
  useEffect(() => {
    const loadProfile = async () => {
      if (!user || isSessionLoading) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('phone, address')
        .eq('id', user.id)
        .single();

      if (profileData) {
        form.reset({
          phone: profileData.phone || '',
          address: profileData.address || '',
        });
        if (profileData.phone) {
          setPaymentPhone(profileData.phone);
        }
      }
    };

    loadProfile();
  }, [user, isSessionLoading, form]);

  // Verificar se usuário está logado
  useEffect(() => {
    if (!isSessionLoading && !user) {
      toast.error(T('Você precisa estar logado para acessar o checkout.', 'You need to be logged in to access checkout.'));
      navigate('/register', { replace: true });
    }
  }, [user, isSessionLoading, navigate, T]);

  // Taxas de conversão para MZN (quando usar M-Pesa/e-Mola)
  const EXCHANGE_RATES = {
    USD: 67, // 1 USD = 67 MZN
    EUR: 77, // 1 EUR = 77 MZN
    BRL: 12, // 1 BRL = 12 MZN
    MZN: 1,  // 1 MZN = 1 MZN
  };

  // Calcular preço baseado no período selecionado
  const calculatedPrice = useMemo(() => {
    if (!selectedPlan) return 0;
    
    const monthlyPrice = selectedPlan.monthlyPrice || selectedPlan.price;
    return monthlyPrice * billingPeriod;
  }, [selectedPlan, billingPeriod]);

  // Converter para MZN se necessário (para M-Pesa/e-Mola)
  const convertedPriceForMobileMoney = useMemo(() => {
    if (!selectedPaymentMethod || selectedPaymentMethod === 'card') {
      return calculatedPrice; // Não precisa converter para cartão
    }

    // Se já está em MZN, retorna direto
    if (currentCurrency.key === 'MZN') {
      return calculatedPrice;
    }

    // Converter para MZN usando a taxa de câmbio
    const rate = EXCHANGE_RATES[currentCurrency.key as keyof typeof EXCHANGE_RATES] || 1;
    return Math.round(calculatedPrice * rate);
  }, [calculatedPrice, selectedPaymentMethod, currentCurrency.key]);

  // Processar pagamento
  const handlePayment = async () => {
    if (!user || !selectedPlan || !selectedPaymentMethod) {
      toast.error(T('Preencha todos os campos necessários.', 'Fill in all required fields.'));
      return;
    }

    // Validar telefone apenas para M-Pesa e e-Mola
    if (selectedPaymentMethod !== 'card') {
      if (!paymentPhone) {
        toast.error(T('Preencha o número de telefone.', 'Fill in the phone number.'));
        return;
      }
      if (!validatePhoneNumber(paymentPhone)) {
        toast.error(T('Número de telefone inválido. Use um número de Moçambique (84, 85, 86, 87).', 'Invalid phone number. Use a Mozambique number (84, 85, 86, 87).'));
        return;
      }
    }

    // Validar formulário
    const isValid = await form.trigger();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    setShowProcessingModal(true);

    try {
      // 1. Garantir que conta seja BUSINESS
      const businessId = await ensureBusinessAccount(user.id);
      if (!businessId) {
        throw new Error(T('Erro ao ativar conta BUSINESS.', 'Error activating BUSINESS account.'));
      }

      // 2. Gerar referência única
      const reference = `AgenCode-${Date.now()}`;

      // 3. Processar pagamento - diferente para cartão vs mobile money
      if (selectedPaymentMethod === 'card') {
        // Processar pagamento via Dodo Payments (cartão)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single();

        const customerName = profileData 
          ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() 
          : user.email?.split('@')[0] || 'Cliente';
        const customerEmail = profileData?.email || user.email || '';

        const dodoResponse = await processDodoPayment({
          amount: calculatedPrice,
          currency: currentCurrency.key.toLowerCase(),
          customerEmail: customerEmail,
          customerName: customerName,
          reference: reference,
          metadata: {
            user_id: user.id,
            plan_name: selectedPlan.name,
            billing_period: billingPeriod,
            business_id: businessId,
          },
        });

        setShowProcessingModal(false);

        if (!dodoResponse.success) {
          throw new Error(dodoResponse.message || T('Erro ao processar pagamento com cartão.', 'Error processing card payment.'));
        }

        // O usuário será redirecionado para a página de checkout do Dodo Payments
        // O pagamento será processado lá e depois retornará via webhook ou callback
        toast.info(T('Redirecionando para página de pagamento...', 'Redirecting to payment page...'));
        return; // Não continuar o fluxo aqui, pois será redirecionado
      } else {
        // Processar pagamento via M-Pesa/e-Mola (mobile money)
        // IMPORTANTE: Converter para MZN se necessário
        const phoneDigits = paymentPhone.replace(/\D/g, '');
        const amountInMZN = convertedPriceForMobileMoney;
        
        const paymentResponse = await processPaymentApi({
          amount: amountInMZN,
          phone: phoneDigits,
          method: selectedPaymentMethod,
          reference,
        });

        setShowProcessingModal(false);

        if (!paymentResponse.success) {
          throw new Error(paymentResponse.message || T('Erro ao processar pagamento.', 'Error processing payment.'));
        }

        // Continuar com o fluxo de criação de assinatura para M-Pesa/e-Mola
        // (o código abaixo será executado apenas para mobile money)
      }

      // 4. Calcular data de expiração baseada no período selecionado
      const now = new Date();
      const expiresAt = addDays(now, billingPeriod * 30);

      // 5. Criar subscription
      const subscriptionData = {
        user_id: user.id,
        plan_name: selectedPlan.name,
        price: calculatedPrice,
        is_trial: false,
        status: 'active',
        created_at: now.toISOString(),
        trial_ends_at: expiresAt.toISOString(), // Salvar a data de expiração
      };

      const { error: subError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData);

      if (subError) {
        throw subError;
      }

      // 6. Registrar pagamento
      const paymentRecord = {
        user_id: user.id,
        amount: calculatedPrice,
        status: 'confirmed',
        payment_type: 'subscription',
        method: selectedPaymentMethod,
        transaction_id: paymentResponse.transaction_id || reference,
        notes: T(`Pagamento da assinatura ${selectedPlan.name} - ${billingPeriod} ${billingPeriod === 1 ? 'mês' : 'meses'}`, `Subscription payment for ${selectedPlan.name} - ${billingPeriod} ${billingPeriod === 1 ? 'month' : 'months'}`),
        payment_date: now.toISOString(),
      };

      await supabase.from('payments').insert(paymentRecord);

      // 7. Atualizar perfil com endereço
      await supabase
        .from('profiles')
        .update({
          address: form.getValues('address'),
          phone: form.getValues('phone'),
          updated_at: now.toISOString(),
        })
        .eq('id', user.id);

      // 8. Enviar email de notificação para admin
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        const userName = profileData ? `${profileData.first_name} ${profileData.last_name}` : user.email || 'Usuário';
        const paymentDate = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const paymentAmount = formatCurrency(calculatedPrice, currentCurrency.key, currentCurrency.locale);
        const paymentMethod = selectedPaymentMethod === 'mpesa' ? 'M-Pesa' : selectedPaymentMethod === 'emola' ? 'e-Mola' : 'Cartão de Crédito/Débito';

        const adminEmailSubject = `💳 Novo Pagamento - ${userName} - ${selectedPlan.name}`;
        const adminEmailBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
              .info-row { padding: 10px 0; border-bottom: 1px solid #eee; }
              .info-row:last-child { border-bottom: none; }
              .info-label { font-weight: bold; color: #333; }
              .info-value { color: #666; margin-top: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💳 Novo Pagamento Recebido</h1>
              </div>
              <div class="content">
                <div class="info-box">
                  <div class="info-row">
                    <div class="info-label">Cliente:</div>
                    <div class="info-value">${userName}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Email:</div>
                    <div class="info-value">${user.email}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Plano:</div>
                    <div class="info-value">${selectedPlan.name}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Período:</div>
                    <div class="info-value">${billingPeriod} ${billingPeriod === 1 ? 'mês' : 'meses'}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Valor:</div>
                    <div class="info-value">${paymentAmount}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Método:</div>
                    <div class="info-value">${paymentMethod}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Data:</div>
                    <div class="info-value">${paymentDate}</div>
                  </div>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: 'emenjoseph7@gmail.com',
          subject: adminEmailSubject,
          body: adminEmailBody,
        });
      } catch (emailError) {
        console.warn('Erro ao enviar email para admin:', emailError);
      }

      // 9. Atualizar tabela consolidada
      try {
        await refreshConsolidatedUserData(user.id);
      } catch (error) {
        console.warn('Erro ao atualizar tabela consolidada:', error);
      }

      // 10. Sucesso - redirecionar
      toast.success(T('Pagamento confirmado! Sua conta foi ativada.', 'Payment confirmed! Your account has been activated.'));
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      setShowProcessingModal(false);
      setPaymentError(error.message || T('Erro ao processar pagamento. Tente novamente.', 'Error processing payment. Please try again.'));
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading
  if (isSessionLoading || isConfigLoading || !subscriptionConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600">{T('Carregando...', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Se não tem plano selecionado
  if (!selectedPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-gray-600">{T('Plano não encontrado.', 'Plan not found.')}</p>
          <Button onClick={() => navigate('/choose-plan')}>
            {T('Escolher Plano', 'Choose Plan')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-primary">
            AgenCode
          </Link>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center">
          {T('Finalizar Compra', 'Complete Purchase')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações de Cobrança */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {T('Informações de Cobrança', 'Billing Information')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{T('Endereço', 'Address')} *</FormLabel>
                          <FormControl>
                            <Input placeholder={T('Digite seu endereço completo', 'Enter your full address')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{T('Telefone', 'Phone')} *</FormLabel>
                          <FormControl>
                            <Input placeholder="(99) 99999-9999" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Seleção de Período */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {T('Período de Pagamento', 'Payment Period')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {BILLING_PERIODS.map((period) => (
                    <Button
                      key={period.months}
                      type="button"
                      variant={billingPeriod === period.months ? 'default' : 'outline'}
                      className={cn(
                        'h-auto py-4 flex flex-col items-center',
                        billingPeriod === period.months && 'bg-black text-white hover:bg-gray-900'
                      )}
                      onClick={() => setBillingPeriod(period.months as 1 | 3 | 6 | 12)}
                    >
                      <span className="text-lg font-bold">{period.label}</span>
                      <span className="text-sm opacity-80 mt-1">
                        {formatCurrency(
                          (selectedPlan.monthlyPrice || selectedPlan.price) * period.months,
                          currentCurrency.key,
                          currentCurrency.locale
                        )}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Seleção de Método de Pagamento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  {T('Método de Pagamento', 'Payment Method')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((method) => (
                    <Button
                      key={method.key}
                      type="button"
                      variant={selectedPaymentMethod === method.key ? 'default' : 'outline'}
                      className={cn(
                        'h-auto py-4 flex items-center justify-center gap-3',
                        selectedPaymentMethod === method.key && 'bg-black text-white hover:bg-gray-900'
                      )}
                      onClick={() => setSelectedPaymentMethod(method.key)}
                    >
                      <img
                        src={method.icon}
                        alt={method.name}
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="font-semibold">{method.name}</span>
                    </Button>
                  ))}
                </div>

                {selectedPaymentMethod && selectedPaymentMethod !== 'card' && (
                  <div className="space-y-2 pt-4 border-t">
                    <label className="text-sm font-medium text-gray-700">
                      {T(`Número de ${PAYMENT_METHODS.find(m => m.key === selectedPaymentMethod)?.name}:`, `Number for ${PAYMENT_METHODS.find(m => m.key === selectedPaymentMethod)?.name}:`)}
                    </label>
                    <Input
                      type="tel"
                      placeholder={T("Ex: 841234567", "Ex: 841234567")}
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      maxLength={9}
                    />
                    <p className="text-xs text-gray-500">
                      {T("Digite apenas os 9 dígitos (sem espaços)", "Enter only 9 digits (no spaces)")}
                    </p>
                    {paymentPhone && !validatePhoneNumber(paymentPhone) && (
                      <p className="text-xs text-red-500">
                        {T("Número inválido. Use 84, 85, 86 ou 87.", "Invalid number. Use 84, 85, 86 or 87.")}
                      </p>
                    )}
                    {/* Mostrar conversão para MZN se necessário */}
                    {currentCurrency.key !== 'MZN' && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                        <p className="text-xs text-blue-800">
                          <strong>{T('Conversão automática:', 'Automatic conversion:')}</strong>
                        </p>
                        <p className="text-xs text-blue-700">
                          {formatCurrency(calculatedPrice, currentCurrency.key, currentCurrency.locale)} = {formatCurrency(convertedPriceForMobileMoney, 'MZN', 'pt-MZ')}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {T('O pagamento será processado em Metical (MZN)', 'Payment will be processed in Metical (MZN)')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {selectedPaymentMethod === 'card' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      {T("Você será redirecionado para uma página segura de pagamento com cartão.", "You will be redirected to a secure card payment page.")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Botão de Pagamento */}
            <Button
              type="button"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePayment}
              disabled={
                isSubmitting ||
                !selectedPaymentMethod ||
                !selectedPlan ||
                (selectedPaymentMethod !== 'card' && (!paymentPhone || !validatePhoneNumber(paymentPhone))) ||
                !form.formState.isValid ||
                calculatedPrice <= 0
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {T('Processando...', 'Processing...')}
                </>
              ) : (
                <>
                  {T('Pagar', 'Pay')} {
                    selectedPaymentMethod && selectedPaymentMethod !== 'card' && currentCurrency.key !== 'MZN'
                      ? formatCurrency(convertedPriceForMobileMoney, 'MZN', 'pt-MZ')
                      : formatCurrency(calculatedPrice, currentCurrency.key, currentCurrency.locale)
                  }
                </>
              )}
            </Button>
          </div>

          {/* Resumo */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>{T('Resumo', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">{T('Plano:', 'Plan:')}</p>
                  <p className="font-bold text-lg">{selectedPlan.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{T('Período:', 'Period:')}</p>
                  <p className="font-semibold">{billingPeriod} {billingPeriod === 1 ? T('mês', 'month') : T('meses', 'months')}</p>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">{T('Total:', 'Total:')}</span>
                    <span className="text-2xl font-extrabold text-green-600">
                      {selectedPaymentMethod && selectedPaymentMethod !== 'card' && currentCurrency.key !== 'MZN'
                        ? formatCurrency(convertedPriceForMobileMoney, 'MZN', 'pt-MZ')
                        : formatCurrency(calculatedPrice, currentCurrency.key, currentCurrency.locale)
                      }
                    </span>
                  </div>
                  {selectedPaymentMethod && selectedPaymentMethod !== 'card' && currentCurrency.key !== 'MZN' && (
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      {T('Convertido de', 'Converted from')} {formatCurrency(calculatedPrice, currentCurrency.key, currentCurrency.locale)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de Processamento */}
      <Dialog open={showProcessingModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              {T('Processando Pagamento', 'Processing Payment')}
            </DialogTitle>
            <DialogDescription>
              {T('Aguarde enquanto processamos seu pagamento...', 'Please wait while we process your payment...')}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Modal de Erro */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {T('Erro no Pagamento', 'Payment Error')}
            </DialogTitle>
            <DialogDescription>
              {paymentError || T('Ocorreu um erro ao processar seu pagamento.', 'An error occurred while processing your payment.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowErrorModal(false)}>
              {T('Fechar', 'Close')}
            </Button>
            <Button onClick={handlePayment}>
              {T('Tentar Novamente', 'Try Again')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckoutPage;
