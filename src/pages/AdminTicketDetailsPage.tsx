import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, ArrowLeft, Send, Loader2, User, Shield, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
  user_name?: string;
  user_email?: string;
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

const AdminTicketDetailsPage: React.FC = () => {
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
    if (!ticketId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error) {
        console.error('[ADMIN TICKET DETAIL] Erro ao buscar ticket:', error);
        toast.error(T('Erro ao carregar ticket.', 'Error loading ticket.'));
        navigate('/admin/tickets');
        return;
      }

      // Buscar informações do usuário
      if (data) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .eq('id', data.user_id)
          .single();

        setTicket({
          ...data,
          user_name: profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Usuário'
            : 'Usuário Desconhecido',
          user_email: profile?.email || '',
        });
      }
    } catch (error: any) {
      console.error('[ADMIN TICKET DETAIL] Erro inesperado:', error);
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
        console.error('[ADMIN TICKET DETAIL] Erro ao buscar mensagens:', error);
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
      console.error('[ADMIN TICKET DETAIL] Erro ao buscar mensagens:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!ticket || !newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      // Criar mensagem
      const { data: messageData, error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          sender_type: 'admin',
          message: newMessage.trim(),
        })
        .select()
        .single();

      if (messageError) {
        console.error('[ADMIN TICKET DETAIL] Erro ao enviar mensagem:', messageError);
        toast.error(T('Erro ao enviar mensagem.', 'Error sending message.'));
        return;
      }

      // Atualizar status do ticket para "in_progress" se estiver "open"
      if (ticket.status === 'open') {
        await supabase
          .from('tickets')
          .update({ status: 'in_progress' })
          .eq('id', ticket.id);
        
        setTicket({ ...ticket, status: 'in_progress' });
      }

      // Adicionar mensagem à lista local
      const newMsg: TicketMessage = {
        ...messageData,
        sender_name: 'Admin',
      };
      setMessages([...messages, newMsg]);
      setNewMessage('');

      toast.success(T('Mensagem enviada com sucesso!', 'Message sent successfully!'));
    } catch (error: any) {
      console.error('[ADMIN TICKET DETAIL] Erro ao enviar mensagem:', error);
      toast.error(T('Erro ao enviar mensagem.', 'Error sending message.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: Ticket['status']) => {
    if (!ticket) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticket.id);

      if (error) {
        console.error('[ADMIN TICKET DETAIL] Erro ao atualizar status:', error);
        toast.error(T('Erro ao atualizar status.', 'Error updating status.'));
        return;
      }

      setTicket({ ...ticket, status: newStatus });
      toast.success(T('Status atualizado com sucesso!', 'Status updated successfully!'));
    } catch (error: any) {
      console.error('[ADMIN TICKET DETAIL] Erro ao atualizar status:', error);
      toast.error(T('Erro ao atualizar status.', 'Error updating status.'));
    }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300"><AlertCircle className="h-3 w-3 mr-1" /> {T('Aberto', 'Open')}</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" /> {T('Em Andamento', 'In Progress')}</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" /> {T('Resolvido', 'Resolved')}</Badge>;
      case 'closed':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300"><XCircle className="h-3 w-3 mr-1" /> {T('Fechado', 'Closed')}</Badge>;
    }
  };

  const getPriorityBadge = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'low':
        return <Badge variant="outline" className="text-gray-600">{T('Baixa', 'Low')}</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-yellow-600">{T('Média', 'Medium')}</Badge>;
      case 'high':
        return <Badge variant="outline" className="text-red-600">{T('Alta', 'High')}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{T('Ticket não encontrado.', 'Ticket not found.')}</p>
        <Button onClick={() => navigate('/admin/tickets')} className="mt-4">
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
          onClick={() => navigate('/admin/tickets')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-red-600 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            {ticket.subject}
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {getStatusBadge(ticket.status)}
            {getPriorityBadge(ticket.priority)}
            <span className="text-sm text-gray-500">
              {T('Por', 'By')}: {ticket.user_name} ({ticket.user_email})
            </span>
            <span className="text-sm text-gray-500">
              {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </span>
          </div>
        </div>
        <Select
          value={ticket.status}
          onValueChange={(value) => handleStatusChange(value as Ticket['status'])}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">{T('Aberto', 'Open')}</SelectItem>
            <SelectItem value="in_progress">{T('Em Andamento', 'In Progress')}</SelectItem>
            <SelectItem value="resolved">{T('Resolvido', 'Resolved')}</SelectItem>
            <SelectItem value="closed">{T('Fechado', 'Closed')}</SelectItem>
          </SelectContent>
        </Select>
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
                  <span className="font-semibold text-sm">{ticket.user_name}</span>
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
                  placeholder={T('Digite sua resposta...', 'Type your response...')}
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
                  className="bg-red-600 hover:bg-red-700"
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

export default AdminTicketDetailsPage;






