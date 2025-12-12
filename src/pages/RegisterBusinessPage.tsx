import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { Loader2, Store, MapPin, Phone, FileText, Palette, Instagram, Facebook } from 'lucide-react';
import WorkingHoursForm from '@/components/WorkingHoursForm';
import SupabaseImageUpload from '@/components/SupabaseImageUpload';
import { generateBusinessSlug } from '@/utils/slug-generator'; // Importar utilitário de slug
import { useCurrency } from '@/contexts/CurrencyContext';
import { useSubscription } from '@/hooks/use-subscription';
import { useNavigate } from 'react-router-dom';
import { refreshConsolidatedUserData } from '@/utils/user-consolidated-data';
import { usePlanLimits } from '@/hooks/use-plan-limits';
import PlanLimitModal from '@/components/PlanLimitModal';
import { useEmailNotifications } from '@/hooks/use-email-notifications';
import { useEmailTemplates } from '@/hooks/use-email-templates';
import { replaceEmailTemplate } from '@/utils/email-template-replacer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { businessCategories, mozambiqueProvinces, getCitiesByProvince, BusinessCategory } from '@/utils/mozambique-locations';

// Define the structure for a single day's schedule
const DayScheduleSchema = z.object({
  day: z.string(),
  is_open: z.boolean(),
  start_time: z.string(),
  end_time: z.string(),
});

// Esquema de validação para o formulário
const BusinessSchema = z.object({
  name: z.string().min(3, "O nome do negócio é obrigatório."),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  logo_url: z.string().optional(),
  cover_photo_url: z.string().optional(),
  working_hours: z.array(DayScheduleSchema).optional(),
  theme_color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Cor inválida. Use formato HEX."),
  instagram_url: z.string().url("URL do Instagram inválida.").optional().or(z.literal('')),
  facebook_url: z.string().url("URL do Facebook inválida.").optional().or(z.literal('')),
  slug: z.string().optional(), // Adicionar slug ao esquema
  category: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  is_public: z.boolean().optional(),
  auto_assign_employees: z.boolean().optional(),
  require_payment_on_booking: z.boolean().optional(),
});

type BusinessFormValues = z.infer<typeof BusinessSchema>;

// Initial schedule definition (must match the one in WorkingHoursForm for consistency)
const initialSchedule = [
  { day: 'Segunda', is_open: true, start_time: '09:00', end_time: '18:00' },
  { day: 'Terça', is_open: true, start_time: '09:00', end_time: '18:00' },
  { day: 'Quarta', is_open: true, start_time: '09:00', end_time: '18:00' },
  { day: 'Quinta', is_open: true, start_time: '09:00', end_time: '18:00' },
  { day: 'Sexta', is_open: true, start_time: '09:00', end_time: '18:00' },
  { day: 'Sábado', is_open: false, start_time: '09:00', end_time: '13:00' },
  { day: 'Domingo', is_open: false, start_time: '00:00', end_time: '00:00' },
];


const RegisterBusinessPage = () => {
  const { user } = useSession();
  const { T, currentCurrency } = useCurrency();
  const navigate = useNavigate();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const { limits, isLoading: isLimitsLoading, refresh: refreshLimits } = usePlanLimits();
  const { sendEmail } = useEmailNotifications();
  const { templates, isLoading: isTemplatesLoading } = useEmailTemplates();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const availableCities = selectedProvince ? getCitiesByProvince(selectedProvince) : [];

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(BusinessSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      phone: "",
      logo_url: "",
      cover_photo_url: "",
      working_hours: initialSchedule,
      theme_color: "#2563eb", // Default blue
      instagram_url: "",
      facebook_url: "",
      slug: "", // Inicializa o slug
      category: "",
      province: "",
      city: "",
      is_public: true,
      auto_assign_employees: false,
      require_payment_on_booking: false,
    },
  });

  // 1. Carregar dados existentes do negócio
  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, description, address, phone, logo_url, cover_photo_url, working_hours, theme_color, instagram_url, facebook_url, slug, category, province, city, is_public')
        .eq('owner_id', user.id)
        .single();
      
      // Tentar buscar auto_assign_employees e require_payment_on_booking separadamente (pode não existir se migration não foi executada)
      let autoAssignEmployees = false;
      let requirePaymentOnBooking = false;
      if (data) {
        try {
          const { data: businessData, error: selectError } = await supabase
            .from('businesses')
            .select('auto_assign_employees, require_payment_on_booking')
            .eq('id', data.id)
            .single();
          
          // Se der erro 400 ou 42703, a coluna não existe
          if (selectError && (selectError.code === '42703' || selectError.message?.includes('does not exist') || selectError.message?.includes('column') || selectError.status === 400)) {
            // Coluna não existe ainda, usar default
            console.warn('Colunas auto_assign_employees ou require_payment_on_booking não encontradas. Execute as migrations necessárias.');
            autoAssignEmployees = false;
            requirePaymentOnBooking = false;
          } else if (businessData) {
            autoAssignEmployees = businessData.auto_assign_employees || false;
            requirePaymentOnBooking = businessData.require_payment_on_booking || false;
          }
        } catch (e: any) {
          // Coluna não existe ainda, usar default
          if (e.code !== '42703' && !e.message?.includes('does not exist') && !e.message?.includes('column') && e.status !== 400) {
            console.warn('Erro ao buscar configurações do negócio:', e);
          }
          autoAssignEmployees = false;
          requirePaymentOnBooking = false;
        }
      }

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        toast.error(T("Erro ao carregar dados do negócio.", "Error loading business data."));
        console.error(error);
        return;
      }

      if (data) {
        setBusinessId(data.id);
        form.reset({
          name: data.name || "",
          description: data.description || "",
          address: data.address || "",
          phone: data.phone || "",
          logo_url: data.logo_url || "",
          cover_photo_url: data.cover_photo_url || "",
          working_hours: data.working_hours || initialSchedule, 
          theme_color: data.theme_color || "#2563eb",
          instagram_url: data.instagram_url || "",
          facebook_url: data.facebook_url || "",
          slug: data.slug || "", // Carrega o slug existente
          category: data.category || "",
          province: data.province || "",
          city: data.city || "",
          is_public: data.is_public !== undefined ? data.is_public : true,
          auto_assign_employees: autoAssignEmployees,
          require_payment_on_booking: requirePaymentOnBooking,
        });
        setSelectedProvince(data.province || "");
      }
    };
    fetchBusiness();
  }, [user, form]);

  // Verificar se conta está ativa
  useEffect(() => {
    if (!isSubscriptionLoading && subscription) {
      if (subscription.status !== 'active' && subscription.status !== 'trial') {
        toast.error(T("Sua conta precisa estar ativa para criar um negócio. Complete o pagamento primeiro.", "Your account needs to be active to create a business. Complete payment first."));
        navigate('/choose-plan');
      }
    } else if (!isSubscriptionLoading && !subscription) {
      toast.error(T("Você precisa ter uma assinatura ativa para criar um negócio.", "You need an active subscription to create a business."));
      navigate('/choose-plan');
    }
  }, [subscription, isSubscriptionLoading, navigate, T]);

  // 2. Submissão do formulário
  const onSubmit = async (values: BusinessFormValues) => {
    if (!user) return;
    
    // Validar se conta está ativa
    if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trial')) {
      toast.error(T("Sua conta precisa estar ativa para criar um negócio. Complete o pagamento primeiro.", "Your account needs to be active to create a business. Complete payment first."));
      navigate('/choose-plan');
      return;
    }

    // Verificar limites de negócios (só bloqueia se for criar um novo negócio)
    if (!businessId && !limits.canCreateBusiness) {
      setShowLimitModal(true);
      return;
    }
    
    setIsSubmitting(true);

    // Gerar slug apenas se for um novo negócio
    // Se for atualização, manter o slug existente (não mudar)
    let finalSlug = values.slug;
    
    if (!businessId) {
      // NOVO NEGÓCIO: Gerar slug único
      let attempts = 0;
      let unique = false;
      
      while (!unique && attempts < 5) {
          finalSlug = generateBusinessSlug(values.name);
          
          // Verifica se o slug já existe
          const { count } = await supabase
              .from('businesses')
              .select('id', { count: 'exact', head: true })
              .eq('slug', finalSlug);

          if (count === 0) {
              unique = true;
          } else {
              attempts++;
          }
      }

      if (!unique) {
          toast.error(T("Não foi possível gerar um slug único. Tente novamente.", "Could not generate unique slug. Please try again."));
          setIsSubmitting(false);
          return;
      }
    } else {
      // ATUALIZAÇÃO: Manter o slug existente (não gerar novo)
      // Se não houver slug salvo, usar o que está no formulário ou gerar um
      if (!finalSlug) {
        // Se por algum motivo não tiver slug, gerar um (caso raro)
        finalSlug = generateBusinessSlug(values.name);
      }
      // Caso contrário, manter o slug existente (finalSlug já tem o valor do formulário)
    }

    const businessData: any = {
      owner_id: user.id,
      name: values.name,
      description: values.description,
      address: values.address,
      phone: values.phone,
      logo_url: values.logo_url,
      cover_photo_url: values.cover_photo_url,
      working_hours: values.working_hours,
      theme_color: values.theme_color,
      instagram_url: values.instagram_url || null,
      facebook_url: values.facebook_url || null,
      // IMPORTANTE: Só incluir slug se for um novo negócio (não atualizar em edições)
      ...(businessId ? {} : { slug: finalSlug }),
      category: values.category || null,
      province: values.province || null,
      city: values.city || null,
      is_public: values.is_public !== undefined ? values.is_public : true,
    };

    // Adicionar auto_assign_employees e require_payment_on_booking sempre (mesmo que false)
    // Isso garante que os valores sejam salvos corretamente
    businessData.auto_assign_employees = values.auto_assign_employees ?? false;
    businessData.require_payment_on_booking = values.require_payment_on_booking ?? false;

    let result;
    if (businessId) {
      // Atualizar dados básicos primeiro
      result = await supabase
        .from('businesses')
        .update(businessData)
        .eq('id', businessId)
        .select('id, slug')
        .single();
    } else {
      // Inserir
      result = await supabase
        .from('businesses')
        .insert(businessData)
        .select('id, slug')
        .single();
    }

    if (result.error) {
      setIsSubmitting(false);
      
      // Verificar se o erro é porque as colunas não existem
      if (result.error.code === '42703' || result.error.message?.includes('does not exist') || result.error.message?.includes('column')) {
        // Se for erro de coluna não existente, tentar salvar sem esses campos
        console.warn('⚠️ Colunas auto_assign_employees ou require_payment_on_booking não existem. Tentando salvar sem esses campos...');
        
        const businessDataWithoutNewFields = { ...businessData };
        delete businessDataWithoutNewFields.auto_assign_employees;
        delete businessDataWithoutNewFields.require_payment_on_booking;
        
        let retryResult;
        if (businessId) {
          retryResult = await supabase
            .from('businesses')
            .update(businessDataWithoutNewFields)
            .eq('id', businessId)
            .select('id, slug')
            .single();
        } else {
          retryResult = await supabase
            .from('businesses')
            .insert(businessDataWithoutNewFields)
            .select('id, slug')
            .single();
        }
        
        if (retryResult.error) {
          toast.error(T("Erro ao salvar o negócio: ", "Error saving business: ") + retryResult.error.message);
          console.error(retryResult.error);
          setIsSubmitting(false);
          return;
        } else {
          toast.warning(T("Negócio salvo, mas algumas configurações não foram aplicadas. Execute as migrations necessárias.", "Business saved, but some settings were not applied. Please run the necessary migrations."));
          const finalBusinessId = retryResult.data.id;
          setBusinessId(finalBusinessId);
          form.setValue('slug', retryResult.data.slug);
          setIsSubmitting(false);
          return;
        }
      } else {
        toast.error(T("Erro ao salvar o negócio: ", "Error saving business: ") + result.error.message);
        console.error(result.error);
        setIsSubmitting(false);
        return;
      }
    }

    // Sucesso - continuar com o fluxo
    const finalBusinessId = result.data.id;
    setBusinessId(finalBusinessId);
    form.setValue('slug', result.data.slug); // Atualiza o slug no formulário
    
    // Atualizar tabela consolidada (se existir)
    // Os triggers do banco também vão atualizar automaticamente, mas isso garante atualização imediata
    try {
      await refreshConsolidatedUserData(user.id);
      console.log('✅ Tabela consolidada atualizada após criar/atualizar negócio');
    } catch (error) {
      console.warn('⚠️ Erro ao atualizar tabela consolidada (não crítico):', error);
    }
    
    // Enviar email de "Negócio Configurado" se for novo negócio
    const isNewBusiness = !businessId;
    if (isNewBusiness && templates?.business_configured && user) {
        try {
          // Buscar dados do perfil do dono
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email, first_name, last_name')
            .eq('id', user.id)
            .maybeSingle();
          
          const ownerEmail = profileData?.email || user.email;
          const ownerName = profileData ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : 'Dono do Negócio';
          
          if (ownerEmail) {
            const template = templates.business_configured;
            
            const businessInfo = {
              logo_url: values.logo_url || null,
              theme_color: values.theme_color || '#2563eb',
              name: values.name,
              phone: values.phone || null,
              address: values.address || null,
            };
            
            const appointmentData = {
              client_name: ownerName,
              client_code: '',
              service_name: '',
              service_duration: 0,
              service_price: 0,
              formatted_date: new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
              formatted_time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              appointment_status: 'pending' as const,
              appointment_id: result.data.id,
              appointment_link: `${window.location.origin}/dashboard`,
              dashboard_link: `${window.location.origin}/dashboard`,
            };
            
            let subject = template.subject;
            let body = template.body
              .replace(/\{\{owner_name\}\}/g, ownerName)
              .replace(/\{\{business_name\}\}/g, businessInfo.name)
              .replace(/\{\{business_primary_color\}\}/g, businessInfo.theme_color)
              .replace(/\{\{business_logo_url\}\}/g, businessInfo.logo_url || '')
              .replace(/\{\{business_address\}\}/g, businessInfo.address || 'Não informado')
              .replace(/\{\{business_whatsapp\}\}/g, businessInfo.phone || 'N/A')
              .replace(/\{\{dashboard_link\}\}/g, appointmentData.dashboard_link);
            
            // Aplicar replaceEmailTemplate para cores e outros placeholders
            body = replaceEmailTemplate(body, businessInfo, appointmentData, currentCurrency);
            
            sendEmail({
              to: ownerEmail,
              subject: subject,
              body: body,
            });
            
            console.log('📧 Email de negócio configurado enviado para:', ownerEmail);
          }
    } catch (emailError) {
      console.error('Erro ao enviar email de negócio configurado:', emailError);
    }
    }
    
    // Mostrar mensagem de sucesso apenas após tudo ser salvo
    toast.success(T("Dados do negócio salvos com sucesso!", "Business data saved successfully!"));
    setIsSubmitting(false);
  };

  const ownerId = user?.id;
  const currentLogoUrl = form.watch('logo_url');
  const currentCoverUrl = form.watch('cover_photo_url');
  const currentSlug = form.watch('slug');

  return (
    <div className="space-y-8 pb-10">
      <div className="rounded-3xl bg-gradient-to-r from-black via-gray-900 to-gray-800 text-white p-8 md:p-10 shadow-2xl">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{T('Configuração do Meu Negócio', 'My Business Configuration')}</h1>
        <p className="text-gray-300 mt-2 max-w-2xl text-sm md:text-base">{T('Preencha as informações que aparecerão na sua página de agendamento.', 'Fill in the information that will appear on your booking page.')}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Dados do Negócio */}
          <Card className="border border-gray-200 shadow-xl rounded-3xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
              <CardTitle className="flex items-center text-black text-xl"><Store className="h-5 w-5 mr-2" /> {T('Informações Básicas e Contato', 'Basic Information and Contact')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">{T('Nome do Negócio', 'Business Name')} *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder={T("Ex: Barbearia do João", "Ex: John's Barber Shop")} {...field} className="pl-10 rounded-2xl h-12" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {currentSlug && (
                <FormItem>
                    <FormLabel className="font-semibold">{T('Link Público', 'Public Link')}</FormLabel>
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
                      <p className="text-sm text-muted-foreground break-all">
                        {window.location.origin}/book/<span className="font-bold text-primary">{currentSlug}</span>
                      </p>
                    </div>
                </FormItem>
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">{T('Descrição Curta (Aparece na página de agendamento)', 'Short Description (Appears on booking page)')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={T("Uma breve descrição para seus clientes.", "A brief description for your clients.")} {...field} className="rounded-2xl min-h-[100px]" />
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
                    <FormLabel className="font-semibold">{T('Endereço Físico (Para exibição no mapa)', 'Physical Address (For map display)')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder={T("Rua Exemplo, 123", "Example Street, 123")} {...field} className="pl-10 rounded-2xl h-12" />
                      </div>
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
                    <FormLabel className="font-semibold">{T('Telefone / WhatsApp do Negócio', 'Phone / WhatsApp of Business')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="(99) 99999-9999" {...field} className="pl-10 rounded-2xl h-12" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">{T('Categoria', 'Category')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger className="rounded-2xl h-12">
                          <SelectValue placeholder={T('Selecione a categoria', 'Select category')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {businessCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Province */}
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">{T('Província', 'Province')}</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedProvince(value);
                        form.setValue('city', ''); // Reset city when province changes
                      }} 
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-2xl h-12">
                          <SelectValue placeholder={T('Selecione a província', 'Select province')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mozambiqueProvinces.map((province) => (
                          <SelectItem key={province.name} value={province.name}>
                            {province.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* City */}
              {selectedProvince && availableCities.length > 0 && (
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">{T('Cidade', 'City')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="rounded-2xl h-12">
                            <SelectValue placeholder={T('Selecione a cidade', 'Select city')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Is Public */}
              <FormField
                control={form.control}
                name="is_public"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-semibold">
                        {T('Exibir no Marketplace', 'Show in Marketplace')}
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        {T('Permitir que seu negócio apareça no marketplace público', 'Allow your business to appear in the public marketplace')}
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="auto_assign_employees"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-semibold">
                        {T('Distribuição Automática de Funcionários', 'Automatic Employee Assignment')}
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        {T('Se ativado, os agendamentos serão distribuídos automaticamente entre os funcionários disponíveis. Se desativado, o cliente escolhe o funcionário.', 'If enabled, appointments will be automatically distributed among available employees. If disabled, the client chooses the employee.')}
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="require_payment_on_booking"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-semibold">
                        {T('Requer Pagamento Durante o Agendamento', 'Require Payment During Booking')}
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        {T('Se ativado, o cliente deve pagar durante o agendamento (M-Pesa, e-Mola ou Cartão). Se o pagamento for bem-sucedido, o agendamento será confirmado automaticamente.', 'If enabled, the client must pay during booking (M-Pesa, e-Mola or Card). If payment is successful, the appointment will be automatically confirmed.')}
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Personalização Visual e Mídia */}
          <Card className="border border-gray-200 shadow-xl rounded-3xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
              <CardTitle className="flex items-center text-black text-xl"><Palette className="h-5 w-5 mr-2" /> {T('Personalização e Mídia', 'Customization and Media')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              
              {/* Theme Color */}
              <FormField
                control={form.control}
                name="theme_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">{T('Cor Principal da Página de Agendamento', 'Main Color of Booking Page')}</FormLabel>
                    <p className="text-xs text-muted-foreground">{T('Esta cor será usada nos botões e destaques da sua página pública.', 'This color will be used on buttons and highlights of your public page.')}</p>
                    <FormControl>
                      <div className="flex items-center space-x-4">
                        <Input 
                          type="color" 
                          className="w-16 h-12 p-1 cursor-pointer rounded-2xl" 
                          {...field} 
                        />
                        <Input 
                          placeholder="#2563eb" 
                          className="flex-grow rounded-2xl h-12" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {ownerId ? (
                <>
                  <FormField
                    control={form.control}
                    name="logo_url"
                    render={({ field }) => (
                      <FormItem>
                        <SupabaseImageUpload
                          bucket="business_media"
                          pathPrefix={ownerId}
                          fileName="logo.png"
                          label="Logo do Negócio"
                          currentUrl={currentLogoUrl}
                          onUploadSuccess={(url) => field.onChange(url)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{T('Recomendado: Imagem quadrada (ex: 200x200 px).', 'Recommended: Square image (e.g., 200x200 px).')}</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cover_photo_url"
                    render={({ field }) => (
                      <FormItem>
                        <SupabaseImageUpload
                          bucket="business_media"
                          pathPrefix={ownerId}
                          fileName="banner.jpg"
                          label={T("Foto de Capa (Banner)", "Cover Photo (Banner)")}
                          currentUrl={currentCoverUrl}
                          onUploadSuccess={(url) => field.onChange(url)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{T('Recomendado: Proporção 3:1 ou 4:1 (ex: 1200x300 px).', 'Recommended: 3:1 or 4:1 ratio (e.g., 1200x300 px).')}</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{T('Carregando informações do usuário...', 'Loading user information...')}</p>
              )}
            </CardContent>
          </Card>
          
          {/* Redes Sociais */}
          <Card className="border border-gray-200 shadow-xl rounded-3xl">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
              <CardTitle className="flex items-center text-black text-xl"><Instagram className="h-5 w-5 mr-2" /> {T('Redes Sociais (Opcional)', 'Social Media (Optional)')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <FormField
                control={form.control}
                name="instagram_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">{T('Link do Instagram', 'Instagram Link')}</FormLabel>
                    <FormControl>
                      <Input placeholder="https://instagram.com/seu_negocio" {...field} className="rounded-2xl h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="facebook_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">{T('Link do Facebook', 'Facebook Link')}</FormLabel>
                    <FormControl>
                      <Input placeholder="https://facebook.com/seu_negocio" {...field} className="rounded-2xl h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Horários de Funcionamento */}
          <FormField
            control={form.control}
            name="working_hours"
            render={() => (
              <FormItem>
                <WorkingHoursForm fieldName="working_hours" />
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting} className="bg-black hover:bg-black/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl h-12 text-base">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              T('Salvar Configurações', 'Save Settings')
            )}
          </Button>
        </form>
      </Form>

      {/* Modal de Limite de Negócios */}
      <PlanLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        limitType="businesses"
        currentPlan={limits.planName}
      />
    </div>
  );
};

export default RegisterBusinessPage;