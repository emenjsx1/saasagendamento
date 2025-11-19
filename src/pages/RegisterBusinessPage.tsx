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
import { Loader2 } from 'lucide-react';
import WorkingHoursForm from '@/components/WorkingHoursForm';
import SupabaseImageUpload from '@/components/SupabaseImageUpload';

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
    },
  });

  // 1. Carregar dados existentes do negócio
  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, description, address, phone, logo_url, cover_photo_url, working_hours')
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
        });
      }
    };
    fetchBusiness();
  }, [user, form]);

  // 2. Submissão do formulário
  const onSubmit = async (values: BusinessFormValues) => {
    if (!user) return;
    setIsSubmitting(true);

    const businessData = {
      owner_id: user.id,
      name: values.name,
      description: values.description,
      address: values.address,
      phone: values.phone,
      logo_url: values.logo_url,
      cover_photo_url: values.cover_photo_url,
      working_hours: values.working_hours,
    };

    let result;
    if (businessId) {
      // Atualizar
      result = await supabase
        .from('businesses')
        .update(businessData)
        .eq('id', businessId)
        .select('id')
        .single();
    } else {
      // Inserir
      result = await supabase
        .from('businesses')
        .insert(businessData)
        .select('id')
        .single();
    }

    setIsSubmitting(false);

    if (result.error) {
      toast.error("Erro ao salvar o negócio: " + result.error.message);
      console.error(result.error);
    } else {
      setBusinessId(result.data.id);
      toast.success("Dados do negócio salvos com sucesso!");
    }
  };

  const ownerId = user?.id;
  const currentLogoUrl = form.watch('logo_url');
  const currentCoverUrl = form.watch('cover_photo_url');

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Configuração do Meu Negócio</h1>
      <p className="text-gray-600">Preencha as informações que aparecerão na sua página de agendamento.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1: Informações Básicas e Contato */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas e Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Negócio *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Barbearia do João" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição Curta</FormLabel>
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
                          <Input placeholder="Rua Exemplo, 123" {...field} />
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
                          <Input placeholder="(99) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Coluna 2: Mídia Uploads */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Mídia (Logo e Capa)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
            </div>
          </div>

          {/* Horários de Funcionamento (Full Width) */}
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