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
  const { T } = useCurrency();
  const navigate = useNavigate();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    },
  });

  // 1. Carregar dados existentes do negócio
  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, description, address, phone, logo_url, cover_photo_url, working_hours, theme_color, instagram_url, facebook_url, slug')
        .eq('owner_id', user.id)
        .single();

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
        });
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
    
    setIsSubmitting(true);

    let finalSlug = values.slug;

    // Se for uma nova criação OU se o slug estiver vazio, geramos um novo
    if (!businessId || !finalSlug) {
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
            }
            attempts++;
        }

        if (!unique) {
            toast.error(T("Não foi possível gerar um slug único. Tente novamente.", "Could not generate unique slug. Please try again."));
            setIsSubmitting(false);
            return;
        }
    }

    const businessData = {
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
      slug: finalSlug, // Salva o slug
    };

    let result;
    if (businessId) {
      // Atualizar
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

    setIsSubmitting(false);

    if (result.error) {
      toast.error(T("Erro ao salvar o negócio: ", "Error saving business: ") + result.error.message);
      console.error(result.error);
    } else {
      setBusinessId(result.data.id);
      form.setValue('slug', result.data.slug); // Atualiza o slug no formulário
      
      // Atualizar tabela consolidada (se existir)
      // Os triggers do banco também vão atualizar automaticamente, mas isso garante atualização imediata
      try {
        await refreshConsolidatedUserData(user.id);
        console.log('✅ Tabela consolidada atualizada após criar/atualizar negócio');
      } catch (error) {
        console.warn('⚠️ Erro ao atualizar tabela consolidada (não crítico):', error);
      }
      
      toast.success(T("Dados do negócio salvos com sucesso!", "Business data saved successfully!"));
    }
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
    </div>
  );
};

export default RegisterBusinessPage;