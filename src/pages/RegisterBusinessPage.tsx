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
import { Loader2, Upload } from 'lucide-react';

// Esquema de validação para o formulário
const BusinessSchema = z.object({
  name: z.string().min(3, "O nome do negócio é obrigatório."),
  description: z.string().optional(),
  address: z.string().optional(),
  // Simplificando working_hours para uma string por enquanto, mas o backend espera JSONB
  // Vamos tratar a lógica de horários separadamente para simplificar o MVP inicial do formulário.
});

type BusinessFormValues = z.infer<typeof BusinessSchema>;

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
    },
  });

  // 1. Carregar dados existentes do negócio
  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, description, address')
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
      // working_hours: [], // Implementação futura
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

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Configuração do Meu Negócio</h1>
      <p className="text-gray-600">Preencha as informações que aparecerão na sua página de agendamento.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Dados do Negócio */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
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
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua Exemplo, 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Uploads (Placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle>Mídia (Logo e Capa)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button variant="outline" type="button" disabled>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo (Futuro)
                </Button>
                <Button variant="outline" type="button" disabled>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Foto de Capa (Futuro)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Horários de Funcionamento (Placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle>Horários de Funcionamento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                A configuração detalhada dos horários será implementada em seguida.
              </p>
            </CardContent>
          </Card>

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