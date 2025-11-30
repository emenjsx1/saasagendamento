import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Lock, Mail, User, Phone, MessageSquare, CreditCard, ArrowLeft, CheckCircle, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { getPlanBySlug, calculateRenewalDate, PricingPlan, generatePricingPlans } from '@/utils/pricing-plans';
import { formatCurrency, cn } from '@/lib/utils';
import { addDays } from 'date-fns';
import { usePublicSettings } from '@/hooks/use-public-settings';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { processPaymentApi, validatePhoneNumber, sendPushNotifications, sendToUtmify } from '@/utils/paymentApi';
import { captureUTMParameters, getUTMParameters } from '@/utils/utm';
import { useEmailNotifications } from '@/hooks/use-email-notifications';
import { useEmailTemplates } from '@/hooks/use-email-templates';
import { refreshConsolidatedUserData } from '@/utils/user-consolidated-data';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ensureBusinessAccount } from '@/utils/business-helpers';

// --- Schemas ---
const AccountSchema = z.object({
  first_name: z.string().min(1, "Nome é obrigatório."),
  last_name: z.string().min(1, "Sobrenome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  phone: z.string().min(5, "Telefone é obrigatório (para M-Pesa/e-Mola)."),
  address: z.string().optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // Se password está preenchido, deve ter pelo menos 6 caracteres
  if (data.password && data.password.length > 0 && data.password.length < 6) {
    return false;
  }
  return true;
}, {
  message: "A senha deve ter pelo menos 6 caracteres.",
  path: ["password"],
}).refine((data) => {
  // Se password está preenchido, deve coincidir com confirmPassword
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type AccountFormValues = z.infer<typeof AccountSchema>;

// --- Componentes de Passo ---

interface PaymentMethod {
  key: 'mpesa' | 'emola';
  name_pt: string;
  name_en: string;
  icon: React.ReactNode;
  instructions_pt: string;
  instructions_en: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    key: 'mpesa',
    name_pt: 'M-Pesa',
    name_en: 'M-Pesa',
    icon: (
      <img 
        src="https://idolo.co.mz/wp-content/uploads/2024/07/MPESA.png" 
        alt="M-Pesa" 
        className="h-6 w-6 object-contain"
        onError={(e) => {
          // Fallback para ícone se a imagem não carregar
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    ),
    instructions_pt: "Instruções: Pague para o número XXXXXXXX via M-Pesa. Após o pagamento, clique em 'Verificar Pagamento'.",
    instructions_en: "Instructions: Pay to number XXXXXXXX via M-Pesa. After payment, click 'Verify Payment'.",
  },
  {
    key: 'emola',
    name_pt: 'e-Mola',
    name_en: 'e-Mola',
    icon: (
      <img 
        src="https://play-lh.googleusercontent.com/2TGAhJ55tiyhCwW0ZM43deGv4lUTFTBMoq83mnAO6-bU5hi2NPyKX8BN8iKt13irK7Y=w240-h480-rw" 
        alt="e-Mola" 
        className="h-6 w-6 object-contain rounded"
        onError={(e) => {
          // Fallback para ícone se a imagem não carregar
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    ),
    instructions_pt: "Instruções: Pague para o número YYYYYYYY via e-Mola. Após o pagamento, clique em 'Verificar Pagamento'.",
    instructions_en: "Instructions: Pay to number YYYYYYYY via e-Mola. After payment, click 'Verify Payment'.",
  },
];

const CheckoutPage: React.FC = () => {
  const { planSlug } = useParams<{ planSlug: string }>();
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  const { subscriptionConfig, isLoading: isConfigLoading } = usePublicSettings();
  const { currentCurrency, T } = useCurrency();
  const { sendEmail } = useEmailNotifications();
  const { templates, isLoading: isTemplatesLoading } = useEmailTemplates();
  
  const [step, setStep] = useState<'account' | 'plan' | 'payment' | 'success'>('account');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<PricingPlan | null>(null);
  const [paymentPhone, setPaymentPhone] = useState<string>(''); // Número de telefone para pagamento
  
  // Estados para modais de pagamento
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [processingTimer, setProcessingTimer] = useState(180); // 180 segundos = 3 minutos
  const [paymentReference, setPaymentReference] = useState<string>('');

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(AccountSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      address: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  // Gera os planos dinamicamente
  const pricingPlans = subscriptionConfig ? generatePricingPlans(subscriptionConfig, currentCurrency) : [];
  const planFromSlug = planSlug ? getPlanBySlug(planSlug, pricingPlans) : null;

  // Carregar dados do perfil se usuário já está logado
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user || isSessionLoading) return;

      // Buscar dados do perfil
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, address')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar perfil:', error);
        return;
      }

      if (profileData) {
        // Preencher formulário com dados do perfil
        form.reset({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          email: user.email || '',
          phone: profileData.phone || '',
          address: profileData.address || '',
          password: '', // Não preencher senha
          confirmPassword: '',
        });
      } else {
        // Se não tem perfil, usar dados do auth
        form.reset({
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          email: user.email || '',
          phone: user.user_metadata?.phone || '',
          address: '',
          password: '',
          confirmPassword: '',
        });
      }

      // Definir userId do usuário logado
      setTempUserId(user.id);
    };

    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSessionLoading]);

  // Definir step inicial baseado no estado do usuário e plano
  useEffect(() => {
    if (isSessionLoading || isConfigLoading || !subscriptionConfig) return;

    // Se usuário já está logado
    if (user && !isSessionLoading) {
      if (planFromSlug && !selectedPlanForPayment) {
        // Se tem plano na URL e ainda não foi selecionado, selecionar e ir para pagamento
        setSelectedPlanForPayment(planFromSlug);
        setStep('payment');
      } else if (selectedPlanForPayment) {
        // Se já tem plano selecionado, ir para pagamento
        setStep('payment');
      } else if (!planFromSlug) {
        // Se não tem plano na URL, redirecionar para choose-plan
        navigate('/choose-plan', { replace: true });
        return;
      }
    } else if (!user && !isSessionLoading) {
      // Se não está logado
      if (planFromSlug && !selectedPlanForPayment) {
        // Se tem plano na URL e ainda não foi selecionado, selecionar e começar criando conta
        setSelectedPlanForPayment(planFromSlug);
        setStep('account');
      } else if (!planFromSlug) {
        // Se não tem plano na URL, redirecionar para choose-plan
        navigate('/choose-plan', { replace: true });
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSessionLoading, isConfigLoading, subscriptionConfig, planFromSlug]);

  // Limpar número de telefone quando mudar o método de pagamento
  useEffect(() => {
    if (selectedPaymentMethod) {
      setPaymentPhone('');
    }
  }, [selectedPaymentMethod]);

  // Não redirecionar automaticamente - deixar o usuário escolher o plano

  // Capturar UTM parameters ao carregar a página
  useEffect(() => {
    captureUTMParameters();
  }, []);

  // Cronômetro para modal de processamento
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (showProcessingModal && processingTimer > 0) {
      interval = setInterval(() => {
        setProcessingTimer((prev) => {
          if (prev <= 1) {
            if (interval) clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showProcessingModal, processingTimer]);

  // Redirecionar para dashboard quando conta for ativada e usuário estiver logado
  useEffect(() => {
    if (step === 'success' && user && !isSessionLoading) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, user, isSessionLoading, navigate]);

  if (isSessionLoading || isConfigLoading || !subscriptionConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- Lógica de Criação de Conta (Step 1) ---
  const handleAccountCreation = async (values: AccountFormValues) => {
    // Se já está logado, apenas atualizar dados e avançar
    if (user && tempUserId) {
      setIsSubmitting(true);
      try {
        // Atualizar perfil
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: values.first_name,
            last_name: values.last_name,
            phone: values.phone,
            address: values.address,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tempUserId);

        if (profileError) {
          console.error("Erro ao atualizar perfil:", profileError);
          throw profileError;
        }

        // Verificar se o plano selecionado é trial (gratuito)
        const currentPlan = selectedPlanForPayment || planFromSlug;
        
        if (currentPlan && currentPlan.isTrial) {
          // Se for plano trial, criar subscription automaticamente e pular pagamento
          try {
            // Verificar se já existe uma subscription ativa para este usuário
            const { data: existingSubscription } = await supabase
              .from('subscriptions')
              .select('id, status')
              .eq('user_id', tempUserId)
              .in('status', ['active', 'trial'])
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (existingSubscription) {
              toast.info(T("Você já possui uma assinatura ativa. Redirecionando para o dashboard...", "You already have an active subscription. Redirecting to dashboard..."));
              setTimeout(() => {
                navigate('/dashboard');
              }, 2000);
              return;
            }

            // ⚠️ VALIDAÇÃO: Verificar se o usuário JÁ teve um teste gratuito antes
            // Buscar TODAS as subscriptions do usuário (não apenas ativas) para verificar histórico de trial
            const { data: allSubscriptions } = await supabase
              .from('subscriptions')
              .select('id, is_trial, status, created_at')
              .eq('user_id', tempUserId)
              .order('created_at', { ascending: false });

            // Verificar se já teve algum trial no histórico
            const hasTrialHistory = allSubscriptions?.some(sub => sub.is_trial === true) || false;

            if (hasTrialHistory) {
              toast.error(T(
                "Você já utilizou seu teste gratuito. O teste gratuito pode ser ativado apenas uma vez por conta.",
                "You have already used your free trial. The free trial can only be activated once per account."
              ));
              // Redirecionar para escolher outro plano após mostrar erro
              setTimeout(() => {
                navigate('/choose-plan');
              }, 3000);
              return;
            }

            const trialEndsAt = addDays(new Date(), subscriptionConfig.trial_days).toISOString();
            
            // Criar subscription com status 'trial'
            const subscriptionData = {
              user_id: tempUserId,
              plan_name: currentPlan.name,
              price: 0,
              is_trial: true,
              trial_ends_at: trialEndsAt,
              status: 'trial',
              created_at: new Date().toISOString(),
            };

            const { error: subError } = await supabase
              .from('subscriptions')
              .insert(subscriptionData);

            if (subError) {
              console.error("Erro ao criar subscription trial:", subError);
              throw subError;
            }

            // Atualizar tabela consolidada
            try {
              await refreshConsolidatedUserData(tempUserId);
              console.log('✅ Tabela consolidada atualizada para usuário trial');
            } catch (error) {
              console.warn('⚠️ Erro ao atualizar tabela consolidada (não crítico):', error);
            }

          toast.success(T("Teste gratuito ativado com sucesso!", "Free trial activated successfully!"));
          
          // Redirecionar para onboarding/welcome
          setTimeout(() => {
            navigate('/welcome');
          }, 1500);
          
          setStep('success');
          return;
          } catch (error: any) {
            console.error("Erro ao criar subscription trial:", error);
            toast.error(error.message || T("Erro ao ativar teste gratuito. Tente novamente.", "Error activating free trial. Please try again."));
          }
        }

        // Se já tem plano selecionado (não trial), ir direto para pagamento
        if (selectedPlanForPayment || planFromSlug) {
          if (planFromSlug && !selectedPlanForPayment) {
            setSelectedPlanForPayment(planFromSlug);
          }
          setStep('payment');
        } else {
          // Se não tem plano, redirecionar para choose-plan
          navigate('/choose-plan', { replace: true });
        }
      } catch (error: any) {
        toast.error(error.message || T("Erro ao atualizar dados.", "Error updating data."));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Se não está logado, validar senha e criar nova conta
    if (!values.password || values.password.length < 6) {
      toast.error(T("A senha deve ter pelo menos 6 caracteres.", "Password must be at least 6 characters."));
      return;
    }
    if (values.password !== values.confirmPassword) {
      toast.error(T("As senhas não coincidem.", "Passwords do not match."));
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Criar o usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password!,
        options: {
          data: {
            first_name: values.first_name,
            last_name: values.last_name,
            phone: values.phone, 
          },
        },
      });

      if (authError) {
        console.error("Auth error:", authError);
        throw authError;
      }
      
      const userId = authData.user?.id;
      if (!userId) throw new Error("Falha ao obter ID do usuário.");

      // 2. Verificar se o perfil existe, se não, criar manualmente
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Perfil não existe, criar manualmente
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: values.email,
            first_name: values.first_name,
            last_name: values.last_name,
            phone: values.phone,
            address: values.address,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (createError) {
          console.error("Erro ao criar perfil:", createError);
          // Continuar mesmo com erro, o trigger pode ter criado
        }
      } else {
        // Perfil existe, atualizar com dados adicionais (address)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: values.first_name,
            last_name: values.last_name,
            phone: values.phone,
            address: values.address,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (profileError) console.error("Erro ao atualizar perfil:", profileError);
      }
      
      // 3. Atualizar tabela consolidada (se existir)
      // Isso vai popular a tabela user_consolidated com todos os dados do usuário
      try {
        await refreshConsolidatedUserData(userId);
        console.log('✅ Tabela consolidada atualizada para novo usuário');
      } catch (error) {
        console.warn('⚠️ Erro ao atualizar tabela consolidada (não crítico):', error);
        // Não bloquear o fluxo se a tabela consolidada não existir ainda
      }
      
      setTempUserId(userId);

      // Enviar notificação para admin sobre novo registro (CheckoutPage é SEMPRE para Dono de Negócio)
      if (templates?.admin_new_registration) {
        try {
          const adminTemplate = templates.admin_new_registration;
          const userName = `${values.first_name} ${values.last_name}`;
          const registrationDate = new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          let adminSubject = adminTemplate.subject;
          let adminBody = adminTemplate.body
            .replace(/\{\{user_name\}\}/g, userName)
            .replace(/\{\{user_email\}\}/g, values.email)
            .replace(/\{\{user_phone\}\}/g, values.phone || 'N/A')
            .replace(/\{\{user_type\}\}/g, 'Dono de Negócio') // SEMPRE Dono de Negócio no CheckoutPage
            .replace(/\{\{registration_date\}\}/g, registrationDate);
          
          sendEmail({
            to: 'emenjoseph7@gmail.com',
            subject: adminSubject,
            body: adminBody,
          });
        } catch (adminEmailError) {
          console.warn('Erro ao enviar email de notificação para admin:', adminEmailError);
        }
      }

      // 3. Verificar se o plano selecionado é trial (gratuito)
      const currentPlan = selectedPlanForPayment || planFromSlug;
      
      if (currentPlan && currentPlan.isTrial) {
        // Se for plano trial, criar subscription automaticamente e pular pagamento
        try {
          // Verificar se já existe uma subscription ativa para este usuário
          const { data: existingSubscription } = await supabase
            .from('subscriptions')
            .select('id, status')
            .eq('user_id', userId)
            .in('status', ['active', 'trial'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingSubscription) {
            toast.info(T("Você já possui uma assinatura ativa. Redirecionando para o dashboard...", "You already have an active subscription. Redirecting to dashboard..."));
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
            return;
          }

          // ⚠️ VALIDAÇÃO: Verificar se o usuário JÁ teve um teste gratuito antes
          // Buscar TODAS as subscriptions do usuário (não apenas ativas) para verificar histórico de trial
          const { data: allSubscriptions } = await supabase
            .from('subscriptions')
            .select('id, is_trial, status, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          // Verificar se já teve algum trial no histórico
          const hasTrialHistory = allSubscriptions?.some(sub => sub.is_trial === true) || false;

          if (hasTrialHistory) {
            toast.error(T(
              "Você já utilizou seu teste gratuito. O teste gratuito pode ser ativado apenas uma vez por conta.",
              "You have already used your free trial. The free trial can only be activated once per account."
            ));
            // Redirecionar para escolher outro plano após mostrar erro
            setTimeout(() => {
              navigate('/choose-plan');
            }, 3000);
            return;
          }

          const trialEndsAt = addDays(new Date(), subscriptionConfig.trial_days).toISOString();
          
          // Criar subscription com status 'trial' ou 'active'
          const subscriptionData = {
            user_id: userId,
            plan_name: currentPlan.name,
            price: 0,
            is_trial: true,
            trial_ends_at: trialEndsAt,
            status: 'trial', // Status trial para contas de teste
            created_at: new Date().toISOString(),
          };

          const { error: subError } = await supabase
            .from('subscriptions')
            .insert(subscriptionData);

          if (subError) {
            console.error("Erro ao criar subscription trial:", subError);
            throw subError;
          }

          // Atualizar tabela consolidada
          try {
            await refreshConsolidatedUserData(userId);
            console.log('✅ Tabela consolidada atualizada para novo usuário trial');
          } catch (error) {
            console.warn('⚠️ Erro ao atualizar tabela consolidada (não crítico):', error);
          }

          // Enviar email de boas-vindas para trial
          const userEmail = values.email;
          if (userEmail) {
            try {
              const expirationDate = format(addDays(new Date(), subscriptionConfig.trial_days), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
              const userName = `${values.first_name} ${values.last_name}`;

              const emailSubject = T(
                `✅ Bem-vindo ao AgenCode - Teste Gratuito Ativado!`,
                `✅ Welcome to AgenCode - Free Trial Activated!`
              );

              const emailBody = `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .success-icon { font-size: 48px; margin-bottom: 20px; }
                    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <div class="success-icon">🎉</div>
                      <h1>${T('Bem-vindo ao AgenCode!', 'Welcome to AgenCode!')}</h1>
                    </div>
                    <div class="content">
                      <p>${T('Olá', 'Hello')} <strong>${userName}</strong>,</p>
                      
                      <p>${T('Parabéns! Sua conta de teste gratuito foi criada com sucesso!', 'Congratulations! Your free trial account has been successfully created!')}</p>
                      
                      <div class="info-box">
                        <h3>${T('Detalhes do Teste Gratuito', 'Free Trial Details')}</h3>
                        <p><strong>${T('Plano:', 'Plan:')}</strong> ${currentPlan.name}</p>
                        <p><strong>${T('Duração:', 'Duration:')}</strong> ${subscriptionConfig.trial_days} ${T('dias', 'days')}</p>
                        <p><strong>${T('Expira em:', 'Expires on:')}</strong> ${expirationDate}</p>
                        <p><strong>${T('Valor:', 'Price:')}</strong> ${T('Grátis', 'Free')}</p>
                      </div>
                      
                      <p>${T('Você pode usar todos os recursos da plataforma durante o período de teste. Aproveite para explorar todas as funcionalidades!', 'You can use all platform features during the trial period. Enjoy exploring all the features!')}</p>
                      
                      <div style="text-align: center;">
                        <a href="${window.location.origin}/dashboard" class="button">
                          ${T('Acessar Painel de Gestão', 'Access Management Dashboard')}
                        </a>
                      </div>
                      
                      <div class="footer">
                        <p>${T('FEITO POR AgenCode', 'MADE BY AgenCode')}</p>
                        <p>${T('Se você tiver alguma dúvida, entre em contato conosco.', 'If you have any questions, please contact us.')}</p>
                      </div>
                    </div>
                  </div>
                </body>
                </html>
              `;

              await sendEmail({
                to: userEmail,
                subject: emailSubject,
                body: emailBody,
              });

              console.log('✅ Email de boas-vindas trial enviado com sucesso');
            } catch (emailError) {
              console.error('Erro ao enviar email de boas-vindas:', emailError);
            }
          }

          toast.success(T("Conta criada com sucesso! Seu teste gratuito está ativo.", "Account created successfully! Your free trial is active."));
          
          // Redirecionar para dashboard após um breve delay
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
          
          setStep('success');
          return;
        } catch (error: any) {
          console.error("Erro ao criar subscription trial:", error);
          toast.error(error.message || T("Erro ao ativar teste gratuito. Tente novamente.", "Error activating free trial. Please try again."));
        }
      }

      // 4. Se já tem plano selecionado (não trial), ir direto para pagamento
      if (selectedPlanForPayment || planFromSlug) {
        if (planFromSlug && !selectedPlanForPayment) {
          setSelectedPlanForPayment(planFromSlug);
        }
        setStep('payment');
      } else {
        // Se não tem plano, redirecionar para choose-plan
        toast.success(T("Conta criada com sucesso! Escolha seu plano.", "Account created successfully! Choose your plan."));
        navigate('/choose-plan', { replace: true });
      }

    } catch (error: any) {
      console.error("Erro completo:", error);
      toast.error(error.message || T("Erro ao criar conta. Verifique sua conexão e tente novamente.", "Error creating account. Check your connection and try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Seleção de Plano (Step 2) ---
  const handlePlanSelection = (selectedPlan: PricingPlan) => {
    setSelectedPlanForPayment(selectedPlan);
    setStep('payment');
  };

  // Validação pré-pagamento
  const validatePaymentData = (): boolean => {
    // Validar nome completo
    const firstName = form.getValues('first_name')?.trim();
    const lastName = form.getValues('last_name')?.trim();
    if (!firstName || !lastName) {
      toast.error(T("Nome completo é obrigatório.", "Full name is required."));
      return false;
    }

    // Validar número de telefone
    if (!paymentPhone) {
      toast.error(T("Número de telefone é obrigatório.", "Phone number is required."));
      return false;
    }

    if (!validatePhoneNumber(paymentPhone)) {
      toast.error(T("Número de telefone inválido. Use um número válido de Moçambique (84, 85, 86, 87).", "Invalid phone number. Use a valid Mozambique number (84, 85, 86, 87)."));
      return false;
    }

    return true;
  };

  // Criar subscription e registrar pagamento após sucesso
  const createSubscriptionAndNotify = async (
    transactionId: string, 
    reference: string,
    orderId?: string,
    customer?: { nome: string; email: string; phone: string },
    utmData?: {
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      utm_term: string | null;
      utm_content: string | null;
    }
  ) => {
    if (!tempUserId || !selectedPlanForPayment || !selectedPaymentMethod) return;

    const amount = selectedPlanForPayment.price;
    const method = selectedPaymentMethod.key;
    const isTrial = selectedPlanForPayment.isTrial;
    const trialEndsAt = isTrial ? addDays(new Date(), subscriptionConfig.trial_days).toISOString() : null;

    // 1. Atualizar perfil do usuário (se necessário)
    const firstName = form.getValues('first_name');
    const lastName = form.getValues('last_name');
    const phone = form.getValues('phone');
    const address = form.getValues('address');

    // Só atualizar se houver mudanças ou se for novo usuário
    if (firstName || lastName || phone || address) {
      await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          address: address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tempUserId);
    }

    // 2. Calcular data de expiração baseada no período do plano
    const now = new Date();
    let expiresAt: Date | null = null;
    let expirationDays = 0;
    
    // Usar planKey para determinar o período (mais confiável)
    if (selectedPlanForPayment.planKey === 'weekly' || selectedPlanForPayment.planSlug === 'weekly') {
      expiresAt = addDays(now, 7);
      expirationDays = 7;
    } else if (selectedPlanForPayment.planKey === 'monthly' || selectedPlanForPayment.planSlug === 'standard') {
      expiresAt = addDays(now, 30);
      expirationDays = 30;
    } else if (selectedPlanForPayment.planKey === 'annual' || selectedPlanForPayment.planSlug === 'teams') {
      expiresAt = addDays(now, 365);
      expirationDays = 365;
    } else if (isTrial || selectedPlanForPayment.planKey === 'trial' || selectedPlanForPayment.planKey === 'free' || selectedPlanForPayment.isFree) {
      expiresAt = trialEndsAt ? new Date(trialEndsAt) : null;
      expirationDays = selectedPlanForPayment.planKey === 'free' ? 3 : subscriptionConfig.trial_days;
    }

    // 3. Criar subscription com status 'active' (após pagamento confirmado)
    const subscriptionData = {
      user_id: tempUserId,
      plan_name: selectedPlanForPayment.name,
      price: amount,
      is_trial: isTrial,
      trial_ends_at: trialEndsAt,
      status: 'active', // Conta aprovada e ativa após pagamento
      created_at: now.toISOString(),
    };

    const { error: subError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData);

    if (subError) {
      console.error("Erro ao criar subscription:", subError);
      throw subError;
    }

    // 4. Registrar pagamento
    const paymentRecord = {
      user_id: tempUserId,
      amount: amount,
      status: 'confirmed',
      payment_type: 'subscription',
      method: method,
      transaction_id: transactionId || reference,
      notes: T(`Pagamento da assinatura ${selectedPlanForPayment.name}`, `Subscription payment for ${selectedPlanForPayment.name}`),
      payment_date: new Date().toISOString(),
    };
    
    const { error: paymentError } = await supabase
      .from('payments')
      .insert(paymentRecord);
      
    if (paymentError) {
      console.error("Erro ao registrar pagamento:", paymentError);
    }

    // 4.5. Enviar notificações push (antes de atualizar tabela consolidada)
    const userName = `${firstName} ${lastName}`;
    try {
      await sendPushNotifications(userName, amount, method);
    } catch (err) {
      console.warn('Erro ao enviar notificações push (não crítico):', err);
    }

    // 6. Enviar email de confirmação de pagamento e ativação
    const userEmail = form.getValues('email');
    if (userEmail && expiresAt) {
      try {
        const expirationDate = format(expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        const expirationTime = expirationDays === 7 
          ? T('7 dias', '7 days')
          : expirationDays === 30
          ? T('30 dias (1 mês)', '30 days (1 month)')
          : expirationDays === 365
          ? T('365 dias (1 ano)', '365 days (1 year)')
          : `${expirationDays} ${T('dias', 'days')}`;

        const emailSubject = T(
          `✅ Conta Ativada - ${selectedPlanForPayment.name}`,
          `✅ Account Activated - ${selectedPlanForPayment.name}`
        );

        const emailBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .success-icon { font-size: 48px; margin-bottom: 20px; }
              .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">✅</div>
                <h1>${T('Conta Ativada com Sucesso!', 'Account Successfully Activated!')}</h1>
              </div>
              <div class="content">
                <p>${T('Olá', 'Hello')} <strong>${userName}</strong>,</p>
                
                <p>${T('Parabéns! Seu pagamento foi confirmado e sua conta foi ativada com sucesso.', 'Congratulations! Your payment has been confirmed and your account has been successfully activated.')}</p>
                
                <div class="info-box">
                  <h3>${T('Detalhes da Assinatura', 'Subscription Details')}</h3>
                  <p><strong>${T('Plano:', 'Plan:')}</strong> ${selectedPlanForPayment.name}</p>
                  <p><strong>${T('Valor Pago:', 'Amount Paid:')}</strong> ${formatCurrency(amount, currentCurrency.key, currentCurrency.locale)}</p>
                  <p><strong>${T('Método de Pagamento:', 'Payment Method:')}</strong> ${method === 'mpesa' ? 'M-Pesa' : 'e-Mola'}</p>
                  <p><strong>${T('Período:', 'Period:')}</strong> ${expirationTime}</p>
                  <p><strong>${T('Data de Expiração:', 'Expiration Date:')}</strong> ${expirationDate}</p>
                </div>
                
                <p>${T('Sua conta está ativa e você pode usar todos os recursos da plataforma durante o período do seu plano.', 'Your account is active and you can use all platform features during your plan period.')}</p>
                
                <p>${T('Você receberá um lembrete 3 dias antes da expiração e no dia da expiração para renovar seu plano.', 'You will receive a reminder 3 days before expiration and on the expiration day to renew your plan.')}</p>
                
                <div style="text-align: center;">
                  <a href="${window.location.origin}/dashboard" class="button" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
                    ${T('Acessar Painel de Gestão', 'Access Management Dashboard')}
                  </a>
                </div>
                <p style="text-align: center; margin-top: 15px;">
                  <a href="${window.location.origin}/dashboard" style="color: #667eea; text-decoration: underline;">
                    ${T('Ou clique aqui para acessar seu dashboard', 'Or click here to access your dashboard')}
                  </a>
                </p>
                
                <div class="footer">
                  <p>${T('FEITO POR AgenCode', 'MADE BY AgenCode')}</p>
                  <p>${T('Se você tiver alguma dúvida, entre em contato conosco.', 'If you have any questions, please contact us.')}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: userEmail,
          subject: emailSubject,
          body: emailBody,
        });

        console.log('✅ Email de confirmação enviado com sucesso');
      } catch (emailError) {
        console.error('Erro ao enviar email de confirmação:', emailError);
        // Não falhar o processo se o email não for enviado
      }
    }

    // 6.5. Enviar email de notificação para admin (emenjoseph7@gmail.com)
    try {
      // Buscar dados do negócio (se houver)
      const { data: businessData } = await supabase
        .from('businesses')
        .select('name')
        .eq('owner_id', tempUserId)
        .maybeSingle();

      const businessName = businessData?.name || 'N/A';
      const userFullName = `${firstName} ${lastName}`;
      const userPhone = phone || 'N/A';
      const userEmailForAdmin = form.getValues('email') || 'N/A';
      const paymentDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const paymentAmount = formatCurrency(amount, currentCurrency.key, currentCurrency.locale);
      const paymentMethod = method === 'mpesa' ? 'M-Pesa' : method === 'emola' ? 'e-Mola' : 'Cartão';

      // Usar template se disponível, senão usar fallback
      if (templates?.admin_new_payment) {
        const template = templates.admin_new_payment;
        let subject = template.subject
          .replace(/\{\{user_name\}\}/g, userFullName)
          .replace(/\{\{plan_name\}\}/g, selectedPlanForPayment.name);
        
        let body = template.body
          .replace(/\{\{user_name\}\}/g, userFullName)
          .replace(/\{\{user_email\}\}/g, userEmailForAdmin)
          .replace(/\{\{user_phone\}\}/g, userPhone)
          .replace(/\{\{plan_name\}\}/g, selectedPlanForPayment.name)
          .replace(/\{\{payment_amount\}\}/g, paymentAmount)
          .replace(/\{\{payment_method\}\}/g, paymentMethod)
          .replace(/\{\{payment_date\}\}/g, paymentDate);

        await sendEmail({
          to: 'emenjoseph7@gmail.com',
          subject: subject,
          body: body,
        });
      } else {
        // Fallback simples
        const adminEmailSubject = `💳 Novo Pagamento - ${userFullName} - ${selectedPlanForPayment.name}`;
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
                    <div class="info-value">${userFullName}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Email:</div>
                    <div class="info-value">${userEmailForAdmin}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Telefone:</div>
                    <div class="info-value">${userPhone}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Negócio:</div>
                    <div class="info-value">${businessName}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Plano:</div>
                    <div class="info-value">${selectedPlanForPayment.name}</div>
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
      }

      console.log('✅ Email de notificação enviado para admin');
    } catch (adminEmailError) {
      console.error('Erro ao enviar email de notificação para admin:', adminEmailError);
      // Não falhar o processo se o email não for enviado
    }

    // 7. Enviar webhook para Utmify (APENAS UMA VEZ, após confirmação do pagamento)
    if (orderId && customer && utmData) {
      try {
        await sendToUtmify('paid', orderId, customer, amount, utmData);
        console.log('✅ Webhook enviado para Utmify (paid)');
      } catch (err) {
        console.warn('⚠️ Erro ao enviar webhook para Utmify (não crítico):', err);
      }
    }

    // 8. Garantir que conta seja marcada como BUSINESS (verificação final após pagamento)
    try {
      const userId = tempUserId || user?.id;
      if (userId) {
        const businessId = await ensureBusinessAccount(userId);
        if (businessId) {
          console.log('✅ Business account confirmado após pagamento bem-sucedido');
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao garantir business account após pagamento (não crítico):', error);
      // Continuar mesmo se falhar, pois já deve ter sido criado antes
    }

    // 9. Atualizar tabela consolidada (APENAS UMA VEZ, no final, após tudo)
    try {
      if (tempUserId) {
        await refreshConsolidatedUserData(tempUserId);
        console.log('✅ Tabela consolidada atualizada após pagamento e todas as operações');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao atualizar tabela consolidada (não crítico):', error);
    }

    // 10. Mostrar sucesso e redirecionar para configuração de negócio
    console.log('✅ Subscription criada com sucesso! Status: active');
    toast.success(T("Pagamento confirmado e conta ativada! Configure seu negócio.", "Payment confirmed and account activated! Set up your business."));
    
    // Fechar modal de processamento
    setShowProcessingModal(false);
    
    // Atualizar step para success para mostrar mensagem apropriada
    setStep('success');
    
    // Aguardar um momento para mostrar a mensagem de sucesso e então redirecionar para configurar negócio
    setTimeout(() => {
      navigate('/register-business');
    }, 2000);
  };

  // Criar subscription pendente (para reportar pagamento)
  const createPendingSubscription = async () => {
    if (!tempUserId || !selectedPlanForPayment || !selectedPaymentMethod) return;

    const amount = selectedPlanForPayment.price;
    const method = selectedPaymentMethod.key;
    const isTrial = selectedPlanForPayment.isTrial;
    const trialEndsAt = isTrial ? addDays(new Date(), subscriptionConfig.trial_days).toISOString() : null;

    // Criar subscription com status pending
    const subscriptionData = {
      user_id: tempUserId,
      plan_name: selectedPlanForPayment.name,
      price: amount,
      is_trial: isTrial,
      trial_ends_at: trialEndsAt,
      status: 'pending_payment',
    };

    const { error: subError } = await supabase
        .from('subscriptions')
      .insert(subscriptionData);

    if (subError) {
      toast.error(T("Erro ao criar pedido pendente.", "Error creating pending order."));
      return;
    }

    // Registrar pagamento pendente
    const paymentRecord = {
      user_id: tempUserId,
      amount: amount,
      status: 'pending',
      payment_type: 'subscription',
      method: method,
      transaction_id: paymentReference || `AgenCode-${Date.now()}`,
      notes: T(`Pagamento pendente - ${selectedPlanForPayment.name}`, `Pending payment - ${selectedPlanForPayment.name}`),
      payment_date: new Date().toISOString(),
    };

    await supabase.from('payments').insert(paymentRecord);

    toast.success(T("Pedido criado como pendente. Um administrador revisará seu pagamento.", "Order created as pending. An administrator will review your payment."));
    setShowErrorModal(false);
    setStep('success');
  };

  // --- Lógica de Pagamento (Step 3) - API Real ---
  const handlePayment = async () => {
    console.log('handlePayment chamado', { tempUserId, selectedPaymentMethod, selectedPlanForPayment, paymentPhone });
    
    if (!tempUserId || !selectedPaymentMethod || !selectedPlanForPayment || !paymentPhone) {
      console.error('Campos faltando:', { tempUserId, selectedPaymentMethod, selectedPlanForPayment, paymentPhone });
      toast.error(T("Preencha todos os campos necessários.", "Fill in all required fields."));
      return;
    }

    // Validação pré-pagamento
    if (!validatePaymentData()) {
      console.error('Validação falhou');
      return;
    }

    // Gerar referência única e orderId
    const orderId = Date.now().toString();
    const reference = `AgenCode-${orderId}`;
    setPaymentReference(reference);

    // Obter dados do cliente
    const firstName = form.getValues('first_name');
    const lastName = form.getValues('last_name');
    const email = form.getValues('email');
    const customer = {
      nome: `${firstName} ${lastName}`,
      email: email,
      phone: paymentPhone.replace(/\D/g, ''),
    };

    // Obter UTM parameters
    const utmData = getUTMParameters();

    // NOTA: Removido sendToUtmify('waiting_payment') para evitar duplicação
    // O webhook será enviado apenas uma vez após confirmação do pagamento (dentro de createSubscriptionAndNotify)

    // Garantir que conta seja marcada como BUSINESS antes de processar pagamento
    try {
      const userId = tempUserId || user?.id;
      if (userId) {
        const businessId = await ensureBusinessAccount(userId);
        if (!businessId) {
          toast.error(T("Erro ao ativar conta BUSINESS. Tente novamente.", "Error activating BUSINESS account. Please try again."));
          setIsSubmitting(false);
          return;
        }
      }
    } catch (error) {
      console.error('Erro ao garantir business account:', error);
      toast.error(T("Erro ao verificar conta. Tente novamente.", "Error checking account. Please try again."));
      setIsSubmitting(false);
      return;
    }

    // Mostrar modal de processamento
    setShowProcessingModal(true);
    setProcessingTimer(180);
    setIsSubmitting(true);

    try {
      const phoneDigits = paymentPhone.replace(/\D/g, '');
      const amount = selectedPlanForPayment.price;
      const method = selectedPaymentMethod.key;

      console.log('Preparando requisição de pagamento:', { phoneDigits, amount, method, reference });


      // Chamar API de pagamento
      console.log('Chamando processPaymentApi...');
      const paymentResponse = await processPaymentApi({
        amount,
        phone: phoneDigits,
        method: method as 'mpesa' | 'emola',
        reference,
      });

      console.log('Resposta da API:', paymentResponse);
      setShowProcessingModal(false);

      if (paymentResponse.success) {
        // Sucesso: criar subscription e notificar
        console.log('✅ Pagamento bem-sucedido! Criando subscription...');
        
        try {
          // Criar subscription e registrar pagamento (dentro de createSubscriptionAndNotify será enviado o webhook)
          await createSubscriptionAndNotify(
            paymentResponse.transaction_id || '',
            paymentResponse.reference || reference,
            orderId,
            customer,
            utmData
          );
          
          // Após pagamento bem-sucedido, a conta já está ativada e subscription está 'active'
          // O usuário pode usar a plataforma durante o período do pacote selecionado
          // O step será atualizado para 'success' dentro de createSubscriptionAndNotify
        } catch (error: any) {
          console.error('Erro ao criar subscription após pagamento:', error);
          toast.error(T("Pagamento confirmado, mas houve erro ao ativar conta. Entre em contato com o suporte.", "Payment confirmed, but error activating account. Please contact support."));
          setShowErrorModal(true);
          setPaymentError(T("Erro ao ativar conta após pagamento.", "Error activating account after payment."));
        }
      } else {
        // Falha: mostrar modal de erro com detalhes
        console.error('Pagamento falhou:', {
          message: paymentResponse.message,
          status: paymentResponse.status,
          details: (paymentResponse as any).details,
        });
        
        // Mostrar mensagem de erro mais detalhada
        let errorMessage = paymentResponse.message || T("Erro ao processar pagamento.", "Error processing payment.");
        if ((paymentResponse as any).details) {
          const details = (paymentResponse as any).details;
          if (details.message) errorMessage = details.message;
          else if (details.error) errorMessage = details.error;
        }
        
        setPaymentError(errorMessage);
        setShowErrorModal(true);
      }
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      setShowProcessingModal(false);
      setPaymentError(error.message || T("Erro ao processar pagamento. Tente novamente.", "Error processing payment. Please try again."));
      setShowErrorModal(true);
      // NÃO recarregar página - deixar usuário tentar novamente ou reportar
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Renderização ---

  const renderAccountForm = () => {
    const isLoggedIn = !!user && !!tempUserId;
    
    return (
    <Card className="shadow-xl h-full">
      <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <User className="h-5 w-5 mr-2" /> 
            {isLoggedIn 
              ? T('1. Confirme seus Dados', '1. Confirm Your Data')
              : T('1. Crie sua Conta', '1. Create Your Account')
            }
          </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAccountCreation)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T('Primeiro Nome', 'First Name')} *</FormLabel>
                    <FormControl><Input autoComplete="given-name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T('Sobrenome', 'Last Name')} *</FormLabel>
                    <FormControl><Input autoComplete="family-name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{T('E-mail', 'Email')} *</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      autoComplete="email"
                      {...field} 
                      disabled={isLoggedIn}
                      className={isLoggedIn ? "bg-gray-100" : ""}
                    />
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
                  <FormLabel>{T('Telefone (WhatsApp/M-Pesa)', 'Phone (WhatsApp/M-Pesa)')} *</FormLabel>
                  <FormControl><Input autoComplete="tel" placeholder="(99) 99999-9999" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{T('Endereço (Opcional)', 'Address (Optional)')}</FormLabel>
                  <FormControl><Input autoComplete="street-address" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isLoggedIn && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T('Criar Senha', 'Create Password')} *</FormLabel>
                    <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T('Confirmar Senha', 'Confirm Password')} *</FormLabel>
                    <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLoggedIn 
                    ? T('Atualizando...', 'Updating...')
                    : T('Criando...', 'Creating...')
                  }
                </>
              ) : (
                isLoggedIn
                  ? T('Continuar para o Pagamento', 'Continue to Payment')
                  : T('Continuar para o Pagamento', 'Continue to Payment')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
    );
  };

  const renderPlanSelectionStep = () => {
    // Filtrar plano Free da lista - apenas mostrar planos pagos no checkout
    const paidPlans = pricingPlans.filter(p => p.planKey !== 'free' && p.planSlug !== 'free');
    
    return (
    <Card className="shadow-xl h-full">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center"><CreditCard className="h-5 w-5 mr-2" /> {T('2. Escolha seu Plano', '2. Choose Your Plan')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paidPlans.map((planOption) => (
            <Card 
              key={planOption.planSlug}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedPlanForPayment?.planSlug === planOption.planSlug ? 'ring-2 ring-primary' : ''
              } ${planOption.isPopular ? 'border-primary border-2' : ''}`}
              onClick={() => handlePlanSelection(planOption)}
            >
              <CardHeader>
                <CardTitle className="text-xl">{planOption.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-primary">
                    {formatCurrency(planOption.price, currentCurrency.key, currentCurrency.locale)}
                  </span>
                  {planOption.billingPeriod && (
                    <span className="text-gray-600 ml-2">/{planOption.billingPeriod}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {planOption.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
  };

  const renderPaymentStep = () => {
    // Se tem plano na URL, não mostrar "2." já que não passou pela seleção de plano
    const stepNumber = planFromSlug ? '' : '2. ';
    return (
    <Card className="shadow-xl h-full">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center"><Phone className="h-5 w-5 mr-2" /> {T(`${stepNumber}Escolha o Método de Pagamento`, `${stepNumber}Choose Payment Method`)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <Button
              key={method.key}
              variant={selectedPaymentMethod?.key === method.key ? 'default' : 'outline'}
              className={cn(
                "w-full justify-start h-14 sm:h-12 text-base transition-all",
                selectedPaymentMethod?.key === method.key 
                  ? "bg-black border-black text-white hover:bg-gray-900" 
                  : "border-2 border-gray-300 hover:border-gray-400"
              )}
              onClick={() => setSelectedPaymentMethod(method)}
            >
              <div className="flex items-center justify-center h-6 w-6 flex-shrink-0">
                {method.icon}
              </div>
              <span className="ml-3 font-semibold">{T(method.name_pt, method.name_en)}</span>
            </Button>
          ))}
        </div>

        {selectedPlanForPayment && (
          <div className="border p-4 rounded-lg bg-gray-50 mb-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{selectedPlanForPayment.name}</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(selectedPlanForPayment.price, currentCurrency.key, currentCurrency.locale)}
              </span>
            </div>
          </div>
        )}
        
        {selectedPaymentMethod && (
          <div className="border p-4 rounded-lg bg-gray-50 space-y-4">
            <h4 className="font-semibold text-lg">
              {T('Método selecionado:', 'Selected method:')} {T(selectedPaymentMethod.name_pt, selectedPaymentMethod.name_en)}
            </h4>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {T(
                  `Insira seu número de ${selectedPaymentMethod.name_pt}`,
                  `Enter your ${selectedPaymentMethod.name_en} number`
                )}
              </label>
              <Input
                type="tel"
                placeholder={T("Ex: 841234567", "Ex: 841234567")}
                value={paymentPhone}
                onChange={(e) => setPaymentPhone(e.target.value)}
                className="w-full"
                maxLength={9}
              />
              <p className="text-xs text-gray-500">
                {T("Digite apenas os 9 dígitos do número (sem espaços ou caracteres especiais)", "Enter only the 9 digits of the number (no spaces or special characters)")}
              </p>
              {paymentPhone && !validatePhoneNumber(paymentPhone) && (
                <p className="text-xs text-red-500">
                  {T("Número inválido. Use um número de Moçambique (84, 85, 86, 87) com 9 dígitos.", "Invalid number. Use a Mozambique number (84, 85, 86, 87) with 9 digits.")}
                </p>
              )}
            </div>
            
            <Button 
              type="button"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Botão clicado, chamando handlePayment');
                if (!isSubmitting && paymentPhone && validatePhoneNumber(paymentPhone) && selectedPlanForPayment) {
                  handlePayment();
                } else {
                  console.warn('Botão clicado mas condições não atendidas:', {
                    isSubmitting,
                    paymentPhone,
                    isValidPhone: paymentPhone ? validatePhoneNumber(paymentPhone) : false,
                    selectedPlanForPayment
                  });
                  if (!paymentPhone) {
                    toast.error(T("Por favor, insira o número de telefone.", "Please enter phone number."));
                  } else if (!validatePhoneNumber(paymentPhone)) {
                    toast.error(T("Número de telefone inválido.", "Invalid phone number."));
                  }
                }
              }}
              disabled={isSubmitting || !paymentPhone || !validatePhoneNumber(paymentPhone) || !selectedPlanForPayment}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {T('Processando pagamento...', 'Processing payment...')}
                </>
              ) : (
                T('Pagar Agora', 'Pay Now')
              )}
            </Button>
          </div>
        )}
        
        <Button variant="link" onClick={() => setStep('account')} className="p-0">
          <ArrowLeft className="h-4 w-4 mr-2" /> {T('Voltar e Editar Dados', 'Go Back and Edit Details')}
        </Button>
      </CardContent>
    </Card>
  );

  const renderSuccessStep = () => (
    <Card className="shadow-xl h-full text-center p-10">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <CardTitle className="text-3xl mb-2">{T('Conta Ativada!', 'Account Activated!')}</CardTitle>
      <p className="text-lg text-gray-600 mb-6">
        {T('Seu pagamento foi confirmado e sua conta está ativa. Agora configure seu negócio para começar.', 'Your payment has been confirmed and your account is active. Now set up your business to get started.')}
      </p>
      <div className="space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-gray-500">
          {T('Redirecionando para configuração do negócio...', 'Redirecting to business setup...')}
        </p>
        <Button asChild size="lg" className="mt-4">
          <Link to="/register-business">{T('Configurar Meu Negócio', 'Set Up My Business')}</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/dashboard">{T('Ir para Dashboard', 'Go to Dashboard')}</Link>
        </Button>
      </div>
    </Card>
  );

  const renderCheckoutSummary = () => {
    const currentPlan = selectedPlanForPayment || (planSlug ? getPlanBySlug(planSlug, pricingPlans) : null);
    
    if (!currentPlan && step !== 'plan') return null;
    
    return (
    <Card className="sticky top-8 shadow-xl border-t-4 border-primary/50">
      <CardHeader>
        <CardTitle className="text-xl">{T('Resumo da Compra', 'Order Summary')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
          {currentPlan ? (
            <>
        <div className="space-y-2 border-b pb-4">
          <div className="flex justify-between text-lg font-bold">
            <span>{T('Plano:', 'Plan:')}</span>
                  <span className="text-primary">{currentPlan.name}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{T('Recorrência:', 'Recurrence:')}</span>
                  <span>{currentPlan.billingPeriod}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{T('Próxima Renovação:', 'Next Renewal:')}</span>
                  <span>{calculateRenewalDate(currentPlan, subscriptionConfig.trial_days)}</span>
          </div>
        </div>
        
              {currentPlan.originalPrice && (
            <div className="flex justify-between text-sm text-gray-500 line-through">
                <span>{T('Preço Original:', 'Original Price:')}</span>
                  <span>{formatCurrency(currentPlan.originalPrice, currentCurrency.key, currentCurrency.locale)}</span>
            </div>
        )}
              {currentPlan.discount && (
            <div className="flex justify-between text-sm text-green-600 font-semibold">
                  <span>{T(`Desconto (${currentPlan.discount}%):`, `Discount (${currentPlan.discount}%):`)}</span>
                  <span>-{formatCurrency(currentPlan.originalPrice! - currentPlan.price, currentCurrency.key, currentCurrency.locale)}</span>
            </div>
        )}

        <div className="flex justify-between text-2xl font-extrabold pt-2 border-t border-dashed">
          <span>{T('Total a Pagar:', 'Total Due:')}</span>
                <span className="text-green-600">{formatCurrency(currentPlan.price, currentCurrency.key, currentCurrency.locale)}</span>
        </div>
        
        <div className="pt-4 space-y-3">
            <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                <span>{T('Garantia de 7 dias.', '7-day guarantee.')}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
                <Lock className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                <span>{T('Pagamento Seguro SSL.', 'Secure SSL Payment.')}</span>
            </div>
            <Button variant="outline" className="w-full text-sm" asChild>
                <a href="https://wa.me/258123456789" target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="h-4 w-4 mr-2" /> {T('Suporte via WhatsApp', 'Support via WhatsApp')}
                </a>
            </Button>
        </div>
            </>
          ) : (
            <p className="text-center text-gray-500 py-4">{T('Escolha um plano', 'Choose a plan')}</p>
          )}
      </CardContent>
    </Card>
  );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
            <Link to="/" className="text-3xl font-bold text-primary">
                AgenCode
            </Link>
        </div>
        
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-6 sm:mb-8 text-center">
          {T('Finalizar Compra', 'Complete Purchase')}
        </h1>
        
        {/* Indicador de Progresso */}
        <div className="mb-6 sm:mb-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            {(() => {
              // Se tem plano na URL, não mostrar step 'plan'
              const steps = planFromSlug 
                ? [
                    { key: 'account' as const, label: T('1 Conta', '1 Account'), number: 1 },
                    { key: 'payment' as const, label: T('2 Pagamento', '2 Payment'), number: 2 },
                  ]
                : [
                    { key: 'account' as const, label: T('1 Conta', '1 Account'), number: 1 },
                    { key: 'plan' as const, label: T('2 Plano', '2 Plan'), number: 2 },
                    { key: 'payment' as const, label: T('3 Pagamento', '3 Payment'), number: 3 },
                  ];
              const stepKeys = planFromSlug ? ['account', 'payment'] : ['account', 'plan', 'payment'];
              return steps.map((stepItem, index, array) => {
                const currentStepIndex = stepKeys.indexOf(step);
                const isActive = step === stepItem.key;
                const isCompleted = currentStepIndex > index;
                
                return (
                  <React.Fragment key={stepItem.key}>
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div
                        className={cn(
                          "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 font-semibold transition-all duration-200 flex-shrink-0",
                          isCompleted
                            ? "bg-black border-black text-white"
                            : isActive
                            ? "bg-black border-black text-white scale-110"
                            : "bg-white border-gray-300 text-gray-400"
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <span className="text-xs sm:text-sm">{stepItem.number}</span>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs sm:text-sm font-medium mt-2 text-center truncate w-full",
                        isActive ? "text-black font-bold" : isCompleted ? "text-gray-600" : "text-gray-400"
                      )}>
                        {stepItem.label}
                      </p>
                    </div>
                    {index < array.length - 1 && (
                      <div className="flex-1 mx-2 sm:mx-4 h-0.5 hidden sm:block">
                        <div className={cn(
                          "h-full transition-all duration-300",
                          isCompleted ? "bg-black" : "bg-gray-300"
                        )} />
                      </div>
                    )}
                  </React.Fragment>
                );
              });
            })()}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Coluna Esquerda: Formulário/Pagamento */}
          <div className="lg:col-span-2 space-y-8">
            {step === 'account' && renderAccountForm()}
            {step === 'plan' && renderPlanSelectionStep()}
            {step === 'payment' && renderPaymentStep()}
            {step === 'success' && renderSuccessStep()}
          </div>

          {/* Coluna Direita: Resumo */}
          <div className="lg:col-span-1">
            {renderCheckoutSummary()}
          </div>
        </div>
      </div>

      {/* Modal de Processamento de Pagamento */}
      <Dialog open={showProcessingModal} onOpenChange={setShowProcessingModal}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              {T('Processando Pagamento', 'Processing Payment')}
            </DialogTitle>
            <DialogDescription>
              {T(
                'Aguarde enquanto processamos seu pagamento. Verifique seu telefone e insira o PIN quando solicitado.',
                'Please wait while we process your payment. Check your phone and enter the PIN when requested.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="mb-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            </div>
            <div className="text-2xl font-bold text-primary mb-2">
              {Math.floor(processingTimer / 60)}:{(processingTimer % 60).toString().padStart(2, '0')}
            </div>
            <p className="text-sm text-gray-600">
              {T('Aguardando confirmação do pagamento...', 'Waiting for payment confirmation...')}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Erro de Pagamento */}
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
          <div className="py-4 space-y-3">
            <p className="text-sm text-gray-600">
              {T(
                'Possíveis causas: PIN incorreto, saldo insuficiente, ou timeout na transação.',
                'Possible causes: Incorrect PIN, insufficient balance, or transaction timeout.'
              )}
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowErrorModal(false);
                setPaymentPhone('');
              }}
              className="w-full sm:w-auto"
            >
              {T('Tentar Novamente', 'Try Again')}
            </Button>
            <Button
              variant="default"
              onClick={createPendingSubscription}
              className="w-full sm:w-auto"
            >
              {T('Reportar Pagamento', 'Report Payment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  }
};

export default CheckoutPage;