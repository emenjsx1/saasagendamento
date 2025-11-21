import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Store, MapPin, Phone, Palette, Instagram, Facebook, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import WorkingHoursForm from '@/components/WorkingHoursForm';
import SupabaseImageUpload from '@/components/SupabaseImageUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrency } from '@/contexts/CurrencyContext';

// Tipos de dados (replicados do use-business.ts e RegisterBusinessPage.tsx)
interface DaySchedule {
  day: string;
  is_open: boolean;
  start_time: string;
  end_time: string;
}

interface BusinessDetails {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  working_hours: DaySchedule[] | null;
  theme_color: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  slug: string | null;
}

// Esquema de validação (simplificado para edição administrativa)
const DayScheduleSchema = z.object({
  day: z.string(),
  is_open: z.boolean(),
  start_time: z.string(),
  end_time: z.string(),
});

const BusinessSchema = z.object({
  name: z.string().min(3, "O nome do negócio é obrigatório."),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  logo_url: z.string().optional().nullable(),
  cover_photo_url: z.string().optional().nullable(),
  working_hours: z.array(DayScheduleSchema).optional().nullable(),
  theme_color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Cor inválida. Use formato HEX."),
  instagram_url: z.string().url("URL do Instagram inválida.").optional().or(z.literal('')).nullable(),
  facebook_url: z.string().url("URL do Facebook inválida.").optional().or(z.literal('')).nullable(),
  slug: z.string().optional().nullable(),
});

type BusinessFormValues = z.infer<typeof BusinessSchema>;

interface AdminBusinessDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  onSuccess: () => void;
}

const AdminBusinessDetailsDialog: React.FC<AdminBusinessDetailsDialogProps> = ({
  open,
  onOpenChange,
  businessId,
  onSuccess,
}) => {
  const { T } = useCurrency();
  const [business, setBusiness] = useState<BusinessDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(BusinessSchema),
    defaultValues: {
      name: "",
      theme_color: "#2563eb",
    },
  });

  const currentLogoUrl = form.watch('logo_url');
  const currentCoverUrl = form.watch('cover_photo_url');
  const ownerId = business?.owner_id;

  // 1. Carregar dados do negócio
  useEffect(() => {
    if (!open || !businessId) return;

    const fetchBusiness = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) {
        toast.error(T("Erro ao carregar detalhes do negócio.", "Error loading business details."));
        console.error(error);
        setBusiness(null);
      } else {
        setBusiness(data as BusinessDetails);
        form.reset({
          name: data.name || "",
          description: data.description || "",
          address: data.address || "",
          phone: data.phone || "",
          logo_url: data.logo_url || null,
          cover_photo_url: data.cover_photo_url || null,
          working_hours: data.working_hours, 
          theme_color: data.theme_color || "#2563eb",
          instagram_url: data.instagram_url || null,
          facebook_url: data.facebook_url || null,
          slug: data.slug || null,
        });
      }
      setIsLoading(false);
    };

    fetchBusiness();
  }, [open, businessId, form]);

  // 2. Submissão do formulário
  const onSubmit = async (values: BusinessFormValues) => {
    if (!business) return;
    setIsSubmitting(true);

    const businessData = {
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
      // Slug não é editável pelo admin aqui para evitar conflitos
    };

    const { error } = await supabase
      .from('businesses')
      .update(businessData)
      .eq('id', business.id);

    setIsSubmitting(false);

    if (error) {
      toast.error(T("Erro ao salvar o negócio: ", "Error saving business: ") + error.message);
      console.error(error);
    } else {
      toast.success(T("Negócio atualizado com sucesso!", "Business updated successfully!"));
      onSuccess();
      onOpenChange(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px]">
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!business) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader><DialogTitle>{T('Erro', 'Error')}</DialogTitle></DialogHeader>
          <p>{T('Detalhes do negócio não puderam ser carregados.', 'Business details could not be loaded.')}</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Store className="h-6 w-6 mr-2" /> {T('Editar Negócio:', 'Edit Business:')} {business.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{T('ID:', 'ID:')} {business.id} | {T('Proprietário:', 'Owner:')} {business.owner_id}</p>
        </DialogHeader>
        
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="media">Mídia/Horários</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
              </TabsList>
              
              {/* Aba 1: Básico */}
              <TabsContent value="basic" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Negócio *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug (Link Público)</FormLabel>
                      <FormControl><Input {...field} disabled className="bg-gray-100" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl><Textarea {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone / WhatsApp</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* Aba 2: Mídia e Horários */}
              <TabsContent value="media" className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="theme_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Palette className="h-4 w-4 mr-2" /> Cor Principal</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-4">
                          <Input type="color" className="w-16 h-10 p-1 cursor-pointer" {...field} />
                          <Input placeholder="#2563eb" className="flex-grow" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {ownerId && (
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
                )}
                
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
              </TabsContent>
              
              {/* Aba 3: Redes Sociais */}
              <TabsContent value="social" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="instagram_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Instagram className="h-4 w-4 mr-2" /> Link do Instagram</FormLabel>
                      <FormControl><Input placeholder="https://instagram.com/seu_negocio" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="facebook_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Facebook className="h-4 w-4 mr-2" /> Link do Facebook</FormLabel>
                      <FormControl><Input placeholder="https://facebook.com/seu_negocio" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-2" /> Fechar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Salvar Alterações</>}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

export default AdminBusinessDetailsDialog;