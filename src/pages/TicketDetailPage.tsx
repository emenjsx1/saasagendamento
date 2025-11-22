import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, ArrowLeft, Send, Loader2, User, Shield } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  created_at: string;
  sender_name?: string;
}

const TicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { T } = useCurrency();
  const { user } = useSession();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (ticketId) {
      fetchTicket();
      fetchMessages();
    }
  }, [ticketId]);

  const fetchTicket = async () => {
    if (!ticketId || !user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('[TICKET DETAIL] Erro ao buscar ticket:', error);
        toast.error(T('Erro ao carregar ticket.', 'Error loading ticket.'));
        navigate('/dashboard/tickets');
        return;
      }

      setTicket(data);
    } catch (error: any) {
      console.error('[TICKET DETAIL] Erro inesperado:', error);
      toast.error(T('Erro ao carregar ticket.', 'Error loading ticket.'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!ticketId) return;

    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[TICKET DETAIL] Erro ao buscar mensagens:', error);
        return;
      }

      // Buscar nomes dos remetentes
      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', senderIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Admin']) || []);

        const messagesWithNames = data.map(msg => ({
          ...msg,
          sender_name: profilesMap.get(msg.sender_id) || (msg.sender_type === 'admin' ? 'Admin' : 'Usuário'),
        }));

        setMessages(messagesWithNames);
      } else {
        setMessages([]);
      }
    } catch (error: any) {
      console.error('[TICKET DETAIL] Erro ao buscar mensagens:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!ticket || !newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      const { data: messageData, error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          sender_type: 'user',
          message: newMessage.trim(),
        })
        .select()
        .single();

      if (messageError) {
        console.error('[TICKET DETAIL] Erro ao enviar mensagem:', messageError);
        toast.error(T('Erro ao enviar mensagem.', 'Error sending message.'));
        return;
      }

      // Adicionar mensagem à lista local
      const newMsg: TicketMessage = {
        ...messageData,
        sender_name: user.user_metadata?.full_name || 'Você',
      };
      setMessages([...messages, newMsg]);
      setNewMessage('');

      toast.success(T('Mensagem enviada com sucesso!', 'Message sent successfully!'));
    } catch (error: any) {
      console.error('[TICKET DETAIL] Erro ao enviar mensagem:', error);
      toast.error(T('Erro ao enviar mensagem.', 'Error sending message.'));
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">{T('Aberto', 'Open')}</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">{T('Em Andamento', 'In Progress')}</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-700 border-green-300">{T('Resolvido', 'Resolved')}</Badge>;
      case 'closed':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300">{T('Fechado', 'Closed')}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{T('Ticket não encontrado.', 'Ticket not found.')}</p>
        <Button onClick={() => navigate('/dashboard/tickets')} className="mt-4">
          {T('Voltar', 'Back')}
        </Button>
      </div>
    );
  }

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
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            {ticket.subject}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            {getStatusBadge(ticket.status)}
            <span className="text-sm text-gray-500">
              {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>

      {/* Conversação */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0 flex flex-col" style={{ minHeight: '600px' }}>
          {/* Descrição Inicial */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{T('Você', 'You')}</span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </div>
          </div>

          {/* Mensagens */}
          <ScrollArea className="flex-1 p-4 min-h-[400px]">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start gap-3",
                    message.sender_type === 'admin' ? "flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.sender_type === 'admin' 
                      ? "bg-red-100" 
                      : "bg-blue-100"
                  )}>
                    {message.sender_type === 'admin' ? (
                      <Shield className="h-4 w-4 text-red-600" />
                    ) : (
                      <User className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div className={cn(
                    "flex-1 max-w-[80%]",
                    message.sender_type === 'admin' ? "text-right" : ""
                  )}>
                    <div className={cn(
                      "inline-block p-3 rounded-lg",
                      message.sender_type === 'admin'
                        ? "bg-red-100 text-red-900"
                        : "bg-blue-100 text-blue-900"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {message.sender_name} • {format(new Date(message.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input de Resposta */}
          {ticket.status !== 'closed' && (
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={T('Digite sua mensagem...', 'Type your message...')}
                  rows={3}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {T('Pressione Ctrl+Enter para enviar', 'Press Ctrl+Enter to send')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketDetailPage;






