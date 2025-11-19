import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { Loader2, User, Phone, Mail, Briefcase, Clock, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SubscriptionManagementSection from '@/components/SubscriptionManagementSection';
import { useCurrency } from '@/contexts/CurrencyContext';

// Esquema de validação para o perfil
const ProfileSchema = z.object({
  first_name: z.string().min(1, "O primeiro nome é obrigatório."),
  last_name: z.string().min(1, "O sobrenome é obrigatório."),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof ProfileSchema>;

const ProfilePage: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const { subscription, daysLeft, isLoading: isSubscriptionLoading } = useSubscription();
  const { T } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPlanManagement, setShowPlanManagement] = useState(false); // Novo estado para o toggle

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
    },
  });

  // 1. Carregar dados do perfil
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        toast.error("Erro ao carregar perfil.");
        console.error(error);
        return;
      }

      if (data) {
        form.reset({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
        });
      }
    };
    fetchProfile();
  }, [user, form]);

  // 2. Submissão do formulário
  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setIsSubmitting(false);

    if (error) {
      toast.error("Erro ao salvar perfil: " + error.message);
      console.error(error);
    } else {
      toast.success("Perfil atualizado com sucesso!");
    }
  };

  if (isSessionLoading || isSubscriptionLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">{T('Ativo', 'Active')}</Badge>;
      case 'trial':
        return <Badge variant="secondary">{T('Teste Gratuito', 'Free Trial')}</Badge>;
      case 'pending_payment':
        return <Badge variant="destructive">{T('Pagamento Pendente', 'Payment Pending')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold flex items-center"><User className="h-7 w-7 mr-3" /> {T('Meu Perfil e Conta', 'My Profile and Account')}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>{T('Informações Pessoais', 'Personal Information')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{T('Primeiro Nome', 'First Name')} *</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormItem>
                <FormLabel>{T('E-mail', 'Email')}</FormLabel>
                <FormControl>
                  <Input value={user?.email} disabled className="bg-gray-100" />
                </FormControl>
              </FormItem>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T('Telefone / WhatsApp', 'Phone / WhatsApp')}</FormLabel>
                    <FormControl>
                      <Input placeholder="(99) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : T('Salvar Perfil', 'Save Profile')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Seção de Status do Plano */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Briefcase className="h-5 w-5 mr-2" /> {T('Status do Plano', 'Plan Status')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">{T('Plano Atual:', 'Current Plan:')}</span>
                <span className="font-bold">{subscription.plan_name}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">{T('Status:', 'Status:')}</span>
                {getStatusBadge(subscription.status)}
              </div>
              
              {subscription.is_trial && subscription.trial_ends_at && (
                <div className={cn(
                    "p-3 rounded-md border",
                    daysLeft !== null && daysLeft <= 1 ? "bg-red-50 border-red-300" : "bg-yellow-50 border-yellow-300"
                )}>
                    <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="flex items-center"><Clock className="h-4 w-4 mr-2" /> {T('Expiração do Teste:', 'Trial Expiration:')}</span>
                        <span>{format(parseISO(subscription.trial_ends_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                    {daysLeft !== null && (
                        <p className={cn(
                            "text-xs mt-1",
                            daysLeft <= 1 ? "text-red-600 font-bold" : "text-yellow-700"
                        )}>
                            {daysLeft === 0 ? T('Seu teste expira hoje!', 'Your trial expires today!') : T(`Faltam ${daysLeft} dia(s) para o fim do teste.`, `${daysLeft} day(s) left in trial.`)}
                        </p>
                    )}
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => setShowPlanManagement(prev => !prev)}
              >
                {showPlanManagement ? (
                    <>
                        <ChevronUp className="h-4 w-4 mr-2" /> {T('Esconder Planos', 'Hide Plans')}
                    </>
                ) : (
                    <>
                        <ChevronDown className="h-4 w-4 mr-2" /> {T('Mudar de Plano / Renovar', 'Change Plan / Renew')}
                    </>
                )}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">{T('Nenhuma assinatura encontrada.', 'No subscription found.')} <Button variant="link" onClick={() => setShowPlanManagement(true)} className="p-0 h-auto">{T('Escolha um plano.', 'Choose a plan.')}</Button></p>
          )}
        </CardContent>
      </Card>
      
      {/* Seção de Gerenciamento de Planos (Toggle) */}
      {showPlanManagement && (
        <div className="mt-8">
          <SubscriptionManagementSection />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;