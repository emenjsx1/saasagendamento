import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClientInteractions, ClientInteraction } from '@/hooks/use-client-interactions';
import { useBusiness } from '@/hooks/use-business';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Loader2, Calendar, Phone, Mail, MessageSquare, FileText, DollarSign, Users } from 'lucide-react';
import { toast } from 'sonner';

const interactionSchema = z.object({
  interaction_type: z.enum(['appointment', 'call', 'email', 'message', 'note', 'payment', 'meeting', 'other']),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
});

type InteractionFormValues = z.infer<typeof interactionSchema>;

interface InteractionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess?: () => void;
}

export function InteractionModal({ open, onOpenChange, clientId, onSuccess }: InteractionModalProps) {
  const { businessId } = useBusiness();
  const { T } = useCurrency();
  const { createInteraction } = useClientInteractions({ clientId });

  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      interaction_type: 'note',
      title: '',
      description: '',
    },
  });

  const onSubmit = async (values: InteractionFormValues) => {
    try {
      if (!businessId) {
        toast.error(T('Negócio não encontrado', 'Business not found'));
        return;
      }

      await createInteraction({
        client_id: clientId,
        business_id: businessId,
        interaction_type: values.interaction_type,
        title: values.title,
        description: values.description || null,
        appointment_id: null,
        payment_id: null,
        metadata: {},
        created_by: null,
      });

      toast.success(T('Interação criada com sucesso!', 'Interaction created successfully!'));
      form.reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating interaction:', error);
      toast.error(
        error.message || 
        T('Erro ao criar interação', 'Error creating interaction')
      );
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'payment':
        return <DollarSign className="h-4 w-4" />;
      case 'meeting':
        return <Users className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getInteractionLabel = (type: string) => {
    const labels: Record<string, string> = {
      appointment: T('Agendamento', 'Appointment'),
      call: T('Ligação', 'Call'),
      email: T('Email', 'Email'),
      message: T('Mensagem', 'Message'),
      payment: T('Pagamento', 'Payment'),
      note: T('Nota', 'Note'),
      meeting: T('Reunião', 'Meeting'),
      other: T('Outro', 'Other'),
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{T('Nova Interação', 'New Interaction')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="interaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{T('Tipo de Interação', 'Interaction Type')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['note', 'call', 'email', 'message', 'appointment', 'payment', 'meeting', 'other'].map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            {getInteractionIcon(type)}
                            {getInteractionLabel(type)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{T('Título', 'Title')} *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder={T('Título da interação', 'Interaction title')}
                      className="rounded-2xl"
                    />
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
                  <FormLabel>{T('Descrição', 'Description')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder={T('Detalhes da interação...', 'Interaction details...')}
                      className="rounded-2xl min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-2xl"
              >
                {T('Cancelar', 'Cancel')}
              </Button>
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
                  T('Criar Interação', 'Create Interaction')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


