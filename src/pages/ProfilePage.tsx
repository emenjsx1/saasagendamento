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
import { Loader2, User, Phone, Mail, Briefcase } from 'lucide-react';

// Esquema de validação para o perfil
const ProfileSchema = z.object({
  first_name: z.string().min(1, "O primeiro nome é obrigatório."),
  last_name: z.string().min(1, "O sobrenome é obrigatório."),
  phone: z.string().optional(),
  // Futuramente: category_id: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof ProfileSchema>;

const ProfilePage: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        .select('first_name, last_name, phone') // Assumindo que 'phone' será adicionado ao perfil
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
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

  if (isSessionLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold flex items-center"><User className="h-7 w-7 mr-3" /> Meu Perfil e Conta</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
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
                      <FormLabel>Primeiro Nome *</FormLabel>
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
                      <FormLabel>Sobrenome *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input value={user?.email} disabled className="bg-gray-100" />
                </FormControl>
              </FormItem>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone / WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="(99) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Perfil'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Seção de Status do Plano (Futuro) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Briefcase className="h-5 w-5 mr-2" /> Status do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aqui você verá seu plano atual e a data de expiração do teste gratuito.</p>
          {/* Lógica para exibir o plano virá em uma etapa futura */}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;