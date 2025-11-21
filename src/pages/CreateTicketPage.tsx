import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, ArrowLeft, Loader2 } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';

const ticketSchema = z.object({
  subject: z.string().min(5, 'Assunto deve ter pelo menos 5 caracteres'),
  description: z.string().min(20, 'Descrição deve ter pelo menos 20 caracteres'),
  priority: z.enum(['low', 'medium', 'high']),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

const CreateTicketPage: React.FC = () => {
  const { T } = useCurrency();
  const navigate = useNavigate();
  const { user } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: '',
      description: '',
      priority: 'medium',
    },
  });

  const onSubmit = async (values: TicketFormValues) => {
    if (!user) {
      toast.error(T('Você precisa estar logado para criar um ticket.', 'You need to be logged in to create a ticket.'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Criar ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          user_id: user.id,
          subject: values.subject,
          description: values.description,
          priority: values.priority,
          status: 'open',
        })
        .select()
        .single();

      if (ticketError) {
        console.error('[CREATE TICKET] Erro ao criar ticket:', ticketError);
        
        // Se a tabela não existe, mostrar mensagem específica
        if (ticketError.code === 'PGRST205' || ticketError.message?.includes('Could not find the table')) {
          toast.error(
            T(
              'Tabela de tickets não encontrada. Execute a migration: supabase/migrations/create_tickets_tables.sql no Supabase SQL Editor.',
              'Tickets table not found. Run the migration: supabase/migrations/create_tickets_tables.sql in Supabase SQL Editor.'
            ),
            { duration: 10000 }
          );
        } else {
          toast.error(T('Erro ao criar ticket.', 'Error creating ticket.'));
        }
        return;
      }

      // Criar primeira mensagem (a descrição inicial)
      const { error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketData.id,
          sender_id: user.id,
          sender_type: 'user',
          message: values.description,
        });

      if (messageError) {
        console.error('[CREATE TICKET] Erro ao criar mensagem inicial:', messageError);
        // Continuar mesmo se houver erro na mensagem
      }
      
      toast.success(T('Ticket criado com sucesso!', 'Ticket created successfully!'));
      navigate('/dashboard/tickets');
    } catch (error: any) {
      console.error('[CREATE TICKET] Erro inesperado:', error);
      toast.error(T('Erro ao criar ticket: ', 'Error creating ticket: ') + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard/tickets')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            {T('Criar Novo Ticket', 'Create New Ticket')}
          </h1>
          <p className="text-gray-600 mt-2">{T('Descreva seu problema ou dúvida', 'Describe your problem or question')}</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{T('Informações do Ticket', 'Ticket Information')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T('Assunto', 'Subject')} *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={T('Ex: Problema com pagamento', 'Ex: Payment issue')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T('Prioridade', 'Priority')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">{T('Baixa', 'Low')}</SelectItem>
                        <SelectItem value="medium">{T('Média', 'Medium')}</SelectItem>
                        <SelectItem value="high">{T('Alta', 'High')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{T('Descrição', 'Description')} *</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={8}
                        placeholder={T('Descreva detalhadamente seu problema ou dúvida...', 'Describe your problem or question in detail...')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard/tickets')}
                >
                  {T('Cancelar', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {T('Criando...', 'Creating...')}
                    </>
                  ) : (
                    T('Criar Ticket', 'Create Ticket')
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTicketPage;

