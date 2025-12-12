import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients, Client } from '@/hooks/use-clients';
import { useBusiness } from '@/hooks/use-business';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const clientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'blocked']),
  tags: z.array(z.string()).default([]),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  client?: Client;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const { businessId } = useBusiness();
  const { T } = useCurrency();
  const { createClient, updateClient } = useClients({ businessId: businessId || undefined });

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || '',
      email: client?.email || '',
      phone: client?.phone || '',
      whatsapp: client?.whatsapp || '',
      address: client?.address || '',
      notes: client?.notes || '',
      status: client?.status || 'active',
      tags: client?.tags || [],
    },
  });

  const onSubmit = async (values: ClientFormValues) => {
    try {
      if (!businessId) {
        toast.error(T('Negócio não encontrado', 'Business not found'));
        return;
      }

      const clientData = {
        business_id: businessId,
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        whatsapp: values.whatsapp || null,
        address: values.address || null,
        notes: values.notes || null,
        status: values.status,
        tags: values.tags,
      };

      if (client) {
        await updateClient(client.id, clientData);
        toast.success(T('Cliente atualizado com sucesso!', 'Client updated successfully!'));
      } else {
        await createClient(clientData);
        toast.success(T('Cliente criado com sucesso!', 'Client created successfully!'));
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast.error(
        error.message || 
        T('Erro ao salvar cliente', 'Error saving client')
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{T('Nome', 'Name')} *</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder={T('Nome completo do cliente', 'Client full name')}
                  className="rounded-2xl"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{T('Email', 'Email')}</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="email"
                    placeholder="cliente@email.com"
                    className="rounded-2xl"
                  />
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
                <FormLabel>{T('Telefone', 'Phone')}</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="841234567"
                    className="rounded-2xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="whatsapp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{T('WhatsApp', 'WhatsApp')}</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="841234567"
                  className="rounded-2xl"
                />
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
              <FormLabel>{T('Endereço', 'Address')}</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder={T('Endereço completo', 'Full address')}
                  className="rounded-2xl"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{T('Status', 'Status')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">{T('Ativo', 'Active')}</SelectItem>
                  <SelectItem value="inactive">{T('Inativo', 'Inactive')}</SelectItem>
                  <SelectItem value="blocked">{T('Bloqueado', 'Blocked')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{T('Notas', 'Notes')}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder={T('Anotações sobre o cliente...', 'Notes about the client...')}
                  className="rounded-2xl min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4 justify-end pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="rounded-2xl"
            >
              {T('Cancelar', 'Cancel')}
            </Button>
          )}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="rounded-2xl"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {T('Salvando...', 'Saving...')}
              </>
            ) : (
              client ? T('Atualizar Cliente', 'Update Client') : T('Criar Cliente', 'Create Client')
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}


