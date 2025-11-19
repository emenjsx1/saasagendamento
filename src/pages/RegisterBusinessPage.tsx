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
        toast.error("Erro ao carregar dados do negócio.");
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

  // 2. Submissão do formulário
  const onSubmit = async (values: BusinessFormValues) => {
    if (!user) return;
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
            toast.error("Não foi possível gerar um slug único. Tente novamente.");
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
      toast.error("Erro ao salvar o negócio: " + result.error.message);
      console.error(result.error);
    } else {
      setBusinessId(result.data.id);
      form.setValue('slug', result.data.slug); // Atualiza o slug no formulário
      toast.success("Dados do negócio salvos com sucesso!");
    }
  };

  const ownerId = user?.id;
  const currentLogoUrl = form.watch('logo_url');
  const currentCoverUrl = form.watch('cover_photo_url');
  const currentSlug = form.watch('slug');

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Configuração do Meu Negócio</h1>
      <p className="text-gray-600">Preencha as informações que aparecerão na sua página de agendamento.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Dados do Negócio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Store className="h-5 w-5 mr-2" /> Informações Básicas e Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Negócio *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Ex: Barbearia do João" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {currentSlug && (
                <FormItem>
                    <FormLabel>Link Público</FormLabel>
                    <p className="text-sm text-muted-foreground break-all">
                        {window.location.origin}/book/<span className="font-bold text-primary">{currentSlug}</span>
                    </p>
                </FormItem>
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição Curta (Aparece na página de agendamento)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Uma breve descrição para seus clientes." {...field} />
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
                    <FormLabel>Endereço Físico (Para exibição no mapa)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Rua Exemplo, 123" {...field} className="pl-10" />
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
                    <FormLabel>Telefone / WhatsApp do Negócio</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="(99) 99999-9999" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Personalização Visual e Mídia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Palette className="h-5 w-5 mr-2" /> Personalização e Mídia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Theme Color */}
              <FormField
                control={form.control}
                name="theme_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor Principal da Página de Agendamento</FormLabel>
                    <p className="text-xs text-muted-foreground">Esta cor será usada nos botões e destaques da sua página pública.</p>
                    <FormControl>
                      <div className="flex items-center space-x-4">
                        <Input 
                          type="color" 
                          className="w-16 h-10 p-1 cursor-pointer" 
                          {...field} 
                        />
                        <Input 
                          placeholder="#2563eb" 
                          className="flex-grow" 
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
                        <p className="text-xs text-muted-foreground mt-1">Recomendado: Imagem quadrada (ex: 200x200 px).</p>
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
                          label="Foto de Capa (Banner)"
                          currentUrl={currentCoverUrl}
                          onUploadSuccess={(url) => field.onChange(url)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Recomendado: Proporção 3:1 ou 4:1 (ex: 1200x300 px).</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Carregando informações do usuário...</p>
              )}
            </CardContent>
          </Card>
          
          {/* Redes Sociais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Instagram className="h-5 w-5 mr-2" /> Redes Sociais (Opcional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="instagram_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link do Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder="https://instagram.com/seu_negocio" {...field} />
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
                    <FormLabel>Link do Facebook</FormLabel>
                    <FormControl>
                      <Input placeholder="https://facebook.com/seu_negocio" {...field} />
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

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Salvar Configurações'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default RegisterBusinessPage;