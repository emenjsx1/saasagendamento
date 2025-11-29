import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, ArrowRight, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Navigate } from 'react-router-dom';
import { useUserType } from '@/hooks/use-user-type';

const LoginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "A senha é obrigatória."),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  const { userType } = useUserType();
  const { T } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Se já estiver logado, redirecionar baseado no tipo de usuário
  useEffect(() => {
    if (user && !isSessionLoading && userType !== 'loading') {
      if (userType === 'admin') {
        navigate('/admin', { replace: true });
      } else if (userType === 'owner') {
        navigate('/dashboard', { replace: true });
      } else if (userType === 'client') {
        navigate('/client/history', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, isSessionLoading, userType, navigate]);

  const handleLogin = async (values: LoginFormValues) => {
    setIsSubmitting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) throw signInError;

      toast.success(T("Login realizado com sucesso!", "Login successful!"));
      
      // Aguardar um pouco para o usuário estar disponível e então vincular agendamentos
      setTimeout(async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          try {
            const { data: linkData, error: linkError } = await supabase.rpc('link_appointments_to_user', {
              p_user_id: currentUser.id,
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
        }
      }, 500);
      
      // Redirecionar baseado no tipo de usuário
      // A lógica de redirecionamento será feita no useEffect abaixo

    } catch (error: any) {
      toast.error(error.message || T("Erro ao fazer login. Verifique suas credenciais.", "Login error. Please check your credentials."));
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

  // Se o usuário já estiver logado, redireciona
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Features do trial (lado direito)
  const trialFeatures = [
    T('Acesso total ao painel de controle', 'Full access to control panel'),
    T('Gestão completa de agendamentos', 'Complete appointment management'),
    T('Relatórios e análises em tempo real', 'Real-time reports and analytics'),
    T('Suporte prioritário', 'Priority support'),
    T('Personalização ilimitada', 'Unlimited customization'),
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
            {T('Bem-vindo de volta', 'Welcome back')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {T('Acesse sua conta para gerenciar seu negócio', 'Sign in to your account to manage your business')}
          </p>

          {/* Formulário */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">{T('Senha', 'Password')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={T('Digite sua senha', 'Enter your password')}
                        className="h-12 border-gray-300 dark:border-gray-600 focus:border-black focus:ring-black"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <Link 
                  to="#" 
                  className="text-sm text-black hover:text-gray-900 dark:text-white dark:hover:text-gray-300 font-medium"
                >
                  {T('Esqueceu a senha?', 'Forgot password?')}
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-black hover:bg-gray-900 text-white font-semibold text-base shadow-md hover:shadow-lg transition-all duration-200" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {T('Entrando...', 'Signing in...')}
                  </>
                ) : (
                  <>
                    {T('Entrar', 'Sign In')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          {/* Link para registro */}
        <div className="mt-6 text-center">
            <span className="text-gray-600 dark:text-gray-400">{T('Não tem uma conta?', 'Don\'t have an account?')} </span>
            <Link to="/register" className="text-black hover:text-gray-900 dark:text-white dark:hover:text-gray-300 font-semibold">
              {T('Crie sua conta gratuita', 'Create your free account')} →
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
              {T('Plataforma confiável', 'Trusted platform')}
            </span>
          </div>

          {/* Título */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {T('Gerencie seu negócio com eficiência', 'Manage your business efficiently')}
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

export default LoginPage;