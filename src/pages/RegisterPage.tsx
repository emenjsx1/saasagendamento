import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, User, Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { useCurrency } from '@/contexts/CurrencyContext';

const RegisterSchema = z.object({
  first_name: z.string().min(1, "Nome é obrigatório."),
  last_name: z.string().min(1, "Sobrenome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  phone: z.string().min(9, "Telefone deve ter 9 dígitos."),
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: searchParams.get('email') || "",
      phone: "",
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
        options: {
          data: {
            first_name: values.first_name,
            last_name: values.last_name,
            phone: values.phone,
          },
        },
      });

      if (authError) throw authError;
      
      if (!authData.user) {
        throw new Error("Falha ao criar usuário.");
      }

      // Atualizar tabela consolidada (se existir)
      try {
        await refreshConsolidatedUserData(authData.user.id);
        console.log('✅ Tabela consolidada atualizada para novo usuário');
      } catch (error) {
        console.warn('⚠️ Erro ao atualizar tabela consolidada (não crítico):', error);
        // Não bloquear o fluxo se a tabela consolidada não existir ainda
      }

      toast.success(T("Conta criada com sucesso! Escolha seu plano.", "Account created successfully! Choose your plan."));
      
      // Redirecionar para escolher plano
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{T('Criar Conta', 'Create Account')}</CardTitle>
          <p className="text-sm text-center text-gray-600 mt-2">
            {T('Após criar sua conta, você escolherá um plano', 'After creating your account, you will choose a plan')}
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{T('Nome', 'First Name')} *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={T('João', 'John')} />
                      </FormControl>
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
                      <FormControl>
                        <Input {...field} placeholder={T('Silva', 'Doe')} />
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
                    <FormLabel>{T('E-mail', 'Email')} *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} placeholder="seu@email.com" />
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
                      <Input {...field} placeholder="841234567" />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500">{T('9 dígitos (sem código do país)', '9 digits (without country code)')}</p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T('Senha', 'Password')} *</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
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
                    <FormLabel>{T('Confirmar Senha', 'Confirm Password')} *</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {T('Criando...', 'Creating...')}
                  </>
                ) : (
                  <>
                    {T('Criar Conta', 'Create Account')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-gray-600">{T('Já tem conta?', 'Already have an account?')} </span>
                <Link to="/login" className="text-primary hover:underline">
                  {T('Fazer Login', 'Log In')}
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;

