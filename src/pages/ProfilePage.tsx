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
import { Loader2, User, Phone, Mail, Briefcase, Clock, ArrowRight, ChevronDown, ChevronUp, Camera, Calendar } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SubscriptionManagementSection from '@/components/SubscriptionManagementSection';
import { useCurrency } from '@/contexts/CurrencyContext';
import SupabaseImageUpload from '@/components/SupabaseImageUpload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePublicSettings } from '@/hooks/use-public-settings';
import { generatePricingPlans, calculateRenewalDate, getPlanBySlug } from '@/utils/pricing-plans';

// Esquema de validação para o perfil
const ProfileSchema = z.object({
  first_name: z.string().min(1, "O primeiro nome é obrigatório."),
  last_name: z.string().min(1, "O sobrenome é obrigatório."),
  phone: z.string().optional(),
  address: z.string().optional(), // Província/Cidade
  avatar_url: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof ProfileSchema>;

const ProfilePage: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const { subscription, daysLeft, isLoading: isSubscriptionLoading } = useSubscription();
  const { T, currentCurrency } = useCurrency();
  const { subscriptionConfig, isLoading: isConfigLoading } = usePublicSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPlanManagement, setShowPlanManagement] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      address: "",
      avatar_url: "",
    },
  });

  // 1. Carregar dados do perfil
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, address, avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        toast.error("Erro ao carregar perfil.");
        console.error(error);
        return;
      }

      if (data) {
        setCurrentAvatarUrl(data.avatar_url || null);
        form.reset({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          address: data.address || "",
          avatar_url: data.avatar_url || "",
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
        address: values.address || null,
        avatar_url: values.avatar_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setIsSubmitting(false);

    if (error) {
      toast.error("Erro ao salvar perfil: " + error.message);
      console.error(error);
    } else {
      toast.success("Perfil atualizado com sucesso!");
      // Disparar evento para atualizar o banner de alerta
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    }
  };

  if (isSessionLoading || isSubscriptionLoading || isConfigLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-gray-800 hover:bg-gray-900 text-white">{T('Ativo', 'Active')}</Badge>;
      case 'trial':
        return <Badge variant="secondary">{T('Teste Gratuito', 'Free Trial')}</Badge>;
      case 'pending_payment':
        return <Badge variant="destructive">{T('Pagamento Pendente', 'Payment Pending')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calcular próxima renovação baseada na data de criação da subscription
  const getNextRenewalDate = (): string | null => {
    if (!subscription || !subscriptionConfig) return null;

    // Se for trial, usar trial_ends_at
    if (subscription.is_trial && subscription.trial_ends_at) {
      return format(parseISO(subscription.trial_ends_at), 'dd/MM/yyyy', { locale: ptBR });
    }

    // Buscar o plano correspondente
    const pricingPlans = generatePricingPlans(subscriptionConfig, currentCurrency);
    
    // Tentar encontrar pelo plan_name
    let currentPlan = pricingPlans.find(p => 
      p.name.toLowerCase() === subscription.plan_name?.toLowerCase()
    );

    // Se não encontrar pelo nome, tentar pelo slug
    if (!currentPlan) {
      const planSlug = subscription.plan_name?.toLowerCase().replace(/\s+/g, '-');
      currentPlan = getPlanBySlug(planSlug || '', pricingPlans);
    }

    if (!currentPlan || !subscription.created_at) return null;

    // Calcular data de renovação baseada na data de criação + período do plano
    const subscriptionDate = parseISO(subscription.created_at);
    let renewalDate: Date;

    if (currentPlan.planKey === 'weekly' || currentPlan.planSlug === 'weekly') {
      renewalDate = addDays(subscriptionDate, 7);
    } else if (currentPlan.planKey === 'monthly' || currentPlan.planSlug === 'standard' || currentPlan.planSlug === 'monthly') {
      renewalDate = addDays(subscriptionDate, 30);
    } else if (currentPlan.planKey === 'annual' || currentPlan.planSlug === 'teams' || currentPlan.planSlug === 'annual') {
      renewalDate = addDays(subscriptionDate, 365);
    } else {
      return null;
    }

    return format(renewalDate, 'dd/MM/yyyy', { locale: ptBR });
  };

  const nextRenewalDate = getNextRenewalDate();

  return (
    <div className="space-y-10 pb-16 max-w-4xl mx-auto">
      <section className="rounded-3xl bg-gradient-to-br from-black via-gray-900 to-gray-700 text-white p-6 md:p-10 shadow-2xl flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{T('Área do proprietário', 'Owner Area')}</p>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-2 flex items-center gap-3">
              <User className="h-8 w-8" />
              {T('Perfil e assinatura', 'Profile & Subscription')}
            </h1>
            <p className="text-gray-300 mt-3 text-sm md:text-base max-w-2xl">
              {T('Atualize seus dados pessoais, telefone de contato e acompanhe o status do seu plano em um painel único.', 'Update personal data, phone number and track your plan status in a single panel.')}
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 px-6 py-4 text-center bg-white/5">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{T('Status geral', 'General status')}</p>
            <p className="text-lg font-semibold mt-2">{subscription ? T('Conta ativa', 'Account active') : T('Sem assinatura', 'No subscription')}</p>
            <p className="text-gray-400 text-xs mt-1">{user?.email}</p>
          </div>
        </div>
      </section>

      <Card className="rounded-3xl border border-gray-200 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">{T('Informações pessoais', 'Personal Information')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Seção de Foto de Perfil */}
              <div className="flex flex-col items-center md:flex-row md:items-start gap-6 pb-6 border-b border-gray-200">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-32 w-32 border-4 border-gray-200 shadow-lg">
                    <AvatarImage src={currentAvatarUrl || undefined} alt={form.watch('first_name') || 'User'} />
                    <AvatarFallback className="bg-gradient-to-br from-gray-800 to-gray-900 text-white text-3xl font-bold">
                      {form.watch('first_name')?.[0]?.toUpperCase() || form.watch('last_name')?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900">
                      {form.watch('first_name') && form.watch('last_name')
                        ? `${form.watch('first_name')} ${form.watch('last_name')}`
                        : T('Sem nome', 'No name')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
                  </div>
                </div>
                <div className="flex-1 w-full md:w-auto">
                  <FormField
                    control={form.control}
                    name="avatar_url"
                    render={({ field }) => (
                      <FormItem>
                        <SupabaseImageUpload
                          bucket="user_avatars"
                          pathPrefix={user?.id || ''}
                          fileName="avatar.jpg"
                          label={T('Foto de Perfil', 'Profile Picture')}
                          currentUrl={currentAvatarUrl}
                          onUploadSuccess={(url) => {
                            field.onChange(url);
                            setCurrentAvatarUrl(url);
                          }}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{T('Primeiro nome', 'First Name')} *</FormLabel>
                      <FormControl>
                        <Input {...field} className="rounded-2xl" />
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
                        <Input {...field} className="rounded-2xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormItem>
                <FormLabel>{T('E-mail', 'Email')}</FormLabel>
                <FormControl>
                  <Input value={user?.email} disabled className="bg-gray-100 rounded-2xl" />
                </FormControl>
              </FormItem>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T('Telefone / WhatsApp', 'Phone / WhatsApp')}</FormLabel>
                    <FormControl>
                      <Input placeholder="(99) 99999-9999" {...field} className="rounded-2xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T('Província/Cidade', 'Province/City')}</FormLabel>
                    <FormControl>
                      <Input placeholder={T('Digite sua Província/Cidade', 'Enter your Province/City')} {...field} className="rounded-2xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting} className="rounded-2xl bg-black text-white hover:bg-black/90">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : T('Salvar perfil', 'Save Profile')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-gray-200 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <Briefcase className="h-5 w-5" />
            {T('Status do plano', 'Plan Status')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{T('Plano atual', 'Current plan')}</p>
                  <p className="text-2xl font-bold mt-2">{subscription.plan_name}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{T('Status', 'Status')}</p>
                  <div className="mt-3">{getStatusBadge(subscription.status)}</div>
                </div>
              </div>

              {/* Seção de Próxima Renovação */}
              {nextRenewalDate && !subscription.is_trial && (
                <div className="rounded-2xl border border-blue-200 p-4 bg-gradient-to-r from-blue-50 to-blue-100">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                      <Calendar className="h-4 w-4" />
                      {T('Próxima Renovação', 'Next Renewal')}
                    </span>
                    <span className="text-lg font-bold text-blue-700">{nextRenewalDate}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    {T('Sua assinatura será renovada automaticamente nesta data.', 'Your subscription will be automatically renewed on this date.')}
                  </p>
                </div>
              )}

              {subscription.is_trial && subscription.trial_ends_at && (
                <div
                  className={cn(
                    'rounded-2xl border p-4 bg-gradient-to-r',
                    daysLeft !== null && daysLeft <= 1
                      ? 'from-red-50 to-red-100 border-red-200'
                      : 'from-yellow-50 to-yellow-100 border-yellow-200'
                  )}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {T('Expiração do teste', 'Trial Expiration')}
                    </span>
                    <span>{format(parseISO(subscription.trial_ends_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                  {daysLeft !== null && (
                    <p
                      className={cn(
                        'text-xs mt-2',
                        daysLeft <= 1 ? 'text-red-700 font-bold' : 'text-yellow-700'
                      )}
                    >
                      {daysLeft === 0
                        ? T('Seu teste expira hoje!', 'Your trial expires today!')
                        : T(`Faltam ${daysLeft} dia(s) para o fim do teste.`, `${daysLeft} day(s) left in trial.`)}
                    </p>
                  )}
                </div>
              )}

              <Button
                variant="outline"
                className="w-full rounded-2xl border-black/10"
                onClick={() => setShowPlanManagement((prev) => !prev)}
              >
                {showPlanManagement ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" /> {T('Esconder planos', 'Hide Plans')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" /> {T('Mudar de plano / Renovar', 'Change Plan / Renew')}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-center text-gray-500">
              {T('Nenhuma assinatura encontrada.', 'No subscription found.')}
              <Button variant="link" onClick={() => setShowPlanManagement(true)} className="p-0 h-auto">
                {T('Escolha um plano.', 'Choose a plan.')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showPlanManagement && (
        <div className="rounded-3xl border border-gray-200 shadow-xl p-6">
          <SubscriptionManagementSection />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;