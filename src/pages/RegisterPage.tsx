import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, ArrowRight, Check, Phone, MapPin, Store } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { useCurrency } from '@/contexts/CurrencyContext';
import { refreshConsolidatedUserData } from '@/utils/user-consolidated-data';
import { useEmailNotifications } from '@/hooks/use-email-notifications';
import { useEmailTemplates } from '@/hooks/use-email-templates';
import { ensureBusinessAccount } from '@/utils/business-helpers';

const RegisterSchema = z.object({
  firstName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  lastName: z.string().min(2, "O sobrenome deve ter pelo menos 2 caracteres."),
  email: z.string().email("E-mail inválido."),
  phone: z.string().min(9, "O telefone deve ter pelo menos 9 dígitos."),
  city: z.string().min(2, "A Província/Cidade é obrigatória."),
  businessName: z.string().min(3, "O nome do negócio é obrigatório (mínimo 3 caracteres)."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof RegisterSchema>;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: isSessionLoading } = useSession();
  const { T } = useCurrency();
  const { sendEmail } = useEmailNotifications();
  const { templates, isLoading: isTemplatesLoading } = useEmailTemplates();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: searchParams.get('email') || "",
      phone: "",
      city: "",
      businessName: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Se já estiver logado, redirecionar
  useEffect(() => {
    if (user && !isSessionLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isSessionLoading, navigate]);

  const handleRegister = async (values: RegisterFormValues) => {
    setIsSubmitting(true);

    try {
      // Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (authError) throw authError;
      
      if (!authData.user) {
        throw new Error("Falha ao criar usuário.");
      }

      // Atualizar perfil com nome, sobrenome, telefone e cidade
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: values.firstName,
          last_name: values.lastName,
          phone: values.phone,
          address: values.city, // Usando o campo address para armazenar cidade/província
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
        // Não bloquear o registro se falhar, apenas logar o erro
      }

      // Atualizar tabela consolidada (se existir)
      try {
        await refreshConsolidatedUserData(authData.user.id);
        console.log('✅ Tabela consolidada atualizada para novo usuário');
      } catch (error) {
        console.warn('⚠️ Erro ao atualizar tabela consolidada (não crítico):', error);
      }

      // Vincular agendamentos existentes por email
      try {
        const { data: linkData, error: linkError } = await supabase.rpc('link_appointments_to_user', {
          p_user_id: authData.user.id,
          p_email: values.email,
        });

        if (linkError) {
          console.warn('⚠️ Erro ao vincular agendamentos (não crítico):', linkError);
        } else if (linkData && linkData > 0) {
          toast.success(
            T(
              `${linkData} agendamento(s) foram vinculados à sua conta.`,
              `${linkData} appointment(s) were linked to your account.`
            ),
            { duration: 5000 }
          );
        }
      } catch (error) {
        console.warn('⚠️ Erro ao vincular agendamentos (não crítico):', error);
      }

      // RegisterPage é SEMPRE para DONO DE NEGÓCIO (não cliente)
      // Enviar email de boas-vindas para dono de negócio
      if (templates?.owner_welcome) {
        try {
          const welcomeTemplate = templates.owner_welcome;
          const ownerName = `${values.firstName} ${values.lastName}`;
          
          let welcomeSubject = welcomeTemplate.subject;
          let welcomeBody = welcomeTemplate.body
            .replace(/\{\{owner_name\}\}/g, ownerName)
            .replace(/\{\{dashboard_link\}\}/g, `${window.location.origin}/dashboard`);
          
          sendEmail({
            to: values.email,
            subject: welcomeSubject,
            body: welcomeBody,
          });
        } catch (emailError) {
          console.warn('Erro ao enviar email de boas-vindas para dono:', emailError);
        }
      }
      
      // Enviar notificação para admin sobre novo registro (sempre como Dono de Negócio)
      if (templates?.admin_new_registration) {
        try {
          const adminTemplate = templates.admin_new_registration;
          const userName = `${values.firstName} ${values.lastName}`;
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
            .replace(/\{\{user_type\}\}/g, 'Dono de Negócio') // SEMPRE Dono de Negócio nesta página
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

      // Marcar conta como BUSINESS criando business com nome fornecido
      // RegisterPage é SEMPRE para DONO DE NEGÓCIO
      try {
        const businessId = await ensureBusinessAccount(authData.user.id, values.businessName);
        if (businessId) {
          console.log('✅ Conta marcada como BUSINESS após registro com nome:', values.businessName);
        } else {
          console.warn('⚠️ Não foi possível criar business (não crítico)');
        }
      } catch (businessError) {
        console.warn('⚠️ Erro ao marcar conta como BUSINESS (não crítico):', businessError);
        // Não bloquear o fluxo se falhar
      }

      toast.success(T("Conta criada com sucesso! Escolha seu plano.", "Account created successfully! Choose your plan."));
      
      // Redirecionar para escolher plano (não mais para checkout)
      navigate('/choose-plan');

    } catch (error: any) {
      toast.error(error.message || T("Erro ao criar conta. Tente novamente.", "Error creating account. Please try again."));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#0069FF]" />
      </div>
    );
  }

  // Features do trial (lado direito)
  const trialFeatures = [
    T('Agendamentos ilimitados', 'Unlimited appointments'),
    T('Página de agendamento personalizada', 'Custom booking page'),
    T('Lembretes automáticos por e-mail', 'Automatic email reminders'),
    T('Integração com calendários', 'Calendar integration'),
    T('Relatórios e análises', 'Reports and analytics'),
  ];

  // Logos de empresas (social proof)
  const companies = ['Dropbox', 'Zendesk', "L'ORÉAL", 'Ancestry'];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex">
      {/* Coluna Esquerda - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 text-black dark:text-white">
            <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold">AgenCode</span>
          </Link>

          {/* Título */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {T('Crie sua conta gratuita', 'Create your free account')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {T('Não é necessário cartão de crédito. Atualize a qualquer momento.', 'No credit card required. Upgrade anytime.')}
          </p>

          {/* Formulário */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">{T('Nome', 'First Name')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder={T('Seu nome', 'Your first name')}
                          className="h-12 border-gray-300 dark:border-gray-600 focus:border-black focus:ring-black"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">{T('Sobrenome', 'Last Name')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder={T('Seu sobrenome', 'Your last name')}
                          className="h-12 border-gray-300 dark:border-gray-600 focus:border-black focus:ring-black"
                          {...field} 
                        />
                      </FormControl>
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
                    <FormLabel className="text-gray-700 dark:text-gray-300">{T('E-mail', 'Email')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder={T('Digite seu e-mail', 'Enter your email')}
                        className="h-12 border-gray-300 dark:border-gray-600 focus:border-black focus:ring-black"
                        {...field} 
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
                    <FormLabel className="text-gray-700 dark:text-gray-300">{T('Telefone', 'Phone')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel" 
                        placeholder={T('Digite seu telefone (ex: 841234567)', 'Enter your phone (e.g. 841234567)')}
                        className="h-12 border-gray-300 dark:border-gray-600 focus:border-black focus:ring-black"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">{T('Província/Cidade', 'Province/City')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder={T('Digite sua Província/Cidade', 'Enter your Province/City')}
                        className="h-12 border-gray-300 dark:border-gray-600 focus:border-black focus:ring-black"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">{T('Nome do seu Negócio', 'Name of your Business')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="text" 
                          placeholder={T('Ex: Barbearia do João', "Ex: John's Barber Shop")}
                          className="h-12 pl-10 border-gray-300 dark:border-gray-600 focus:border-black focus:ring-black"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">{T('Senha', 'Password')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={T('Crie uma senha', 'Create a password')}
                        className="h-12 border-gray-300 dark:border-gray-600 focus:border-black focus:ring-black"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">{T('Confirmar Senha', 'Confirm Password')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={T('Confirme sua senha', 'Confirm your password')}
                        className="h-12 border-gray-300 dark:border-gray-600 focus:border-black focus:ring-black"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 bg-black hover:bg-gray-900 text-white font-semibold text-base shadow-md hover:shadow-lg transition-all duration-200" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {T('Criando...', 'Creating...')}
                  </>
                ) : (
                  <>
                    {T('Continuar com e-mail', 'Continue with email')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          {/* Link para login */}
          <div className="mt-6 text-center">
            <span className="text-gray-600 dark:text-gray-400">{T('Já tem uma conta?', 'Already have an account?')} </span>
            <Link to="/login" className="text-black hover:text-gray-900 dark:text-white dark:hover:text-gray-300 font-semibold">
              {T('Fazer Login', 'Log In')} →
            </Link>
          </div>
        </div>
      </div>

      {/* Coluna Direita - Features e Social Proof - Estilo Calendly */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-8 lg:p-12 flex-col justify-center">
        <div className="max-w-md mx-auto">
          {/* Badge Trial */}
          <div className="mb-6">
            <span className="inline-block px-4 py-2 bg-black/10 text-black dark:text-white rounded-full text-sm font-semibold">
              {T('Experimente o plano grátis', 'Try free plan')}
            </span>
          </div>

          {/* Título */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {T('Explore recursos premium com seu teste gratuito', 'Explore premium features with your free trial')}
          </h2>

          {/* Lista de Features */}
          <ul className="space-y-4 mb-10">
            {trialFeatures.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <Check className="h-6 w-6 text-black dark:text-white flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300 text-base">{feature}</span>
              </li>
            ))}
          </ul>

          {/* Social Proof */}
          <div className="mt-8 pt-8 border-t border-gray-300 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {T('Junte-se às principais empresas usando a ferramenta de agendamento #1', 'Join leading companies using the #1 scheduling tool')}
            </p>
            
            {/* Logos das empresas */}
            <div className="flex flex-wrap items-center gap-6 opacity-60">
              {companies.map((company, idx) => (
                <div 
                  key={idx}
                  className="text-gray-500 dark:text-gray-400 font-semibold text-sm"
                >
                  {company}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
