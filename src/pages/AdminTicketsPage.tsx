import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Clock, CheckCircle, XCircle, AlertCircle, Loader2, User, Shield, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

const AdminTicketsPage: React.FC = () => {
  const { T } = useCurrency();
  const { user } = useSession();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');

  // Carregar todos os tickets
  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  // Carregar mensagens quando um ticket é selecionado
  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        // Se a tabela não existir, apenas mostrar lista vazia
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          console.warn('[ADMIN TICKETS] Tabela tickets não encontrada. Funcionalidade desabilitada.');
          setTickets([]);
          setIsLoading(false);
          return;
        }
        console.error('[ADMIN TICKETS] Erro ao buscar tickets:', error);
        toast.error(T('Erro ao carregar tickets.', 'Error loading tickets.'));
        setTickets([]);
        setIsLoading(false);
        return;
      }

      // Buscar informações dos usuários
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(t => t.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const ticketsWithUsers = data.map(ticket => ({
          ...ticket,
          user_name: profilesMap.get(ticket.user_id) 
            ? `${profilesMap.get(ticket.user_id)?.first_name || ''} ${profilesMap.get(ticket.user_id)?.last_name || ''}`.trim()
            : 'Usuário Desconhecido',
          user_email: profilesMap.get(ticket.user_id)?.email || '',
        }));

        setTickets(ticketsWithUsers);
      } else {
        setTickets([]);
      }
    } catch (error: any) {
      console.error('[ADMIN TICKETS] Erro inesperado:', error);
      toast.error(T('Erro ao carregar tickets.', 'Error loading tickets.'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[ADMIN TICKETS] Erro ao buscar mensagens:', error);
        toast.error(T('Erro ao carregar mensagens.', 'Error loading messages.'));
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
      console.error('[ADMIN TICKETS] Erro ao buscar mensagens:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      // Criar mensagem
      const { data: messageData, error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          sender_type: 'admin',
          message: newMessage.trim(),
        })
        .select()
        .single();

      if (messageError) {
        console.error('[ADMIN TICKETS] Erro ao enviar mensagem:', messageError);
        toast.error(T('Erro ao enviar mensagem.', 'Error sending message.'));
        return;
      }

      // Atualizar status do ticket para "in_progress" se estiver "open"
      if (selectedTicket.status === 'open') {
        await supabase
          .from('tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
        
        setSelectedTicket({ ...selectedTicket, status: 'in_progress' });
        fetchTickets(); // Atualizar lista
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
      console.error('[ADMIN TICKETS] Erro ao enviar mensagem:', error);
      toast.error(T('Erro ao enviar mensagem.', 'Error sending message.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: Ticket['status']) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) {
        console.error('[ADMIN TICKETS] Erro ao atualizar status:', error);
        toast.error(T('Erro ao atualizar status.', 'Error updating status.'));
        return;
      }

      // Atualizar ticket selecionado
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }

      // Atualizar lista
      fetchTickets();

      toast.success(T('Status atualizado com sucesso!', 'Status updated successfully!'));
    } catch (error: any) {
      console.error('[ADMIN TICKETS] Erro ao atualizar status:', error);
      toast.error(T('Erro ao atualizar status.', 'Error updating status.'));
    }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"><AlertCircle className="h-3 w-3 mr-1" /> {T('Aberto', 'Open')}</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"><Clock className="h-3 w-3 mr-1" /> {T('Em Andamento', 'In Progress')}</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"><CheckCircle className="h-3 w-3 mr-1" /> {T('Resolvido', 'Resolved')}</Badge>;
      case 'closed':
        return <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700"><XCircle className="h-3 w-3 mr-1" /> {T('Fechado', 'Closed')}</Badge>;
    }
  };

  const getPriorityBadge = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'low':
        return <Badge variant="outline" className="text-gray-600 dark:text-gray-400">{T('Baixa', 'Low')}</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400">{T('Média', 'Medium')}</Badge>;
      case 'high':
        return <Badge variant="outline" className="text-red-600 dark:text-red-400">{T('Alta', 'High')}</Badge>;
    }
  };

  const filteredTickets = filterStatus === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            {T('Gerenciamento de Tickets', 'Tickets Management')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{T('Visualize e responda todos os tickets de suporte', 'View and respond to all support tickets')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Tickets */}
        <div className="lg:col-span-1 space-y-4">
          {/* Filtros */}
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('all')}
                >
                  {T('Todos', 'All')}
                </Button>
                <Button
                  variant={filterStatus === 'open' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('open')}
                >
                  {T('Abertos', 'Open')}
                </Button>
                <Button
                  variant={filterStatus === 'in_progress' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('in_progress')}
                >
                  {T('Em Andamento', 'In Progress')}
                </Button>
                <Button
                  variant={filterStatus === 'resolved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('resolved')}
                >
                  {T('Resolvidos', 'Resolved')}
                </Button>
                <Button
                  variant={filterStatus === 'closed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('closed')}
                >
                  {T('Fechados', 'Closed')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">{T('Tickets', 'Tickets')} ({filteredTickets.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">{T('Nenhum ticket encontrado.', 'No tickets found.')}</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2 p-4">
                    {filteredTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={cn(
                          "p-4 border rounded-lg transition-all hover:shadow-md",
                          selectedTicket?.id === ticket.id 
                            ? "border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-900/20 shadow-md" 
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 
                            className="font-semibold text-sm flex-1 line-clamp-2 cursor-pointer hover:text-red-600"
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            {ticket.subject}
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/tickets/${ticket.id}`);
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                          <p>{ticket.user_name || T('Usuário', 'User')}</p>
                          <p>{format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Área de Conversação */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card className="border-0 shadow-lg h-full flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{selectedTicket.subject}</CardTitle>
                    <div className="flex items-center gap-3 flex-wrap">
                      {getStatusBadge(selectedTicket.status)}
                      {getPriorityBadge(selectedTicket.priority)}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {T('Por', 'By')}: {selectedTicket.user_name} ({selectedTicket.user_email})
                      </span>
                    </div>
                  </div>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value) => handleStatusChange(selectedTicket.id, value as Ticket['status'])}
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
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0">
                {/* Descrição Inicial */}
                <div className="p-4 border-b bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm dark:text-gray-200">{selectedTicket.user_name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(selectedTicket.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedTicket.description}</p>
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
                            ? "bg-red-100 dark:bg-red-900/30" 
                            : "bg-blue-100 dark:bg-blue-900/30"
                        )}>
                          {message.sender_type === 'admin' ? (
                            <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
                          ) : (
                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className={cn(
                          "flex-1 max-w-[80%]",
                          message.sender_type === 'admin' ? "text-right" : ""
                        )}>
                          <div className={cn(
                            "inline-block p-3 rounded-lg",
                            message.sender_type === 'admin'
                              ? "bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200"
                              : "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200"
                          )}>
                            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {message.sender_name} • {format(new Date(message.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input de Resposta */}
                <div className="p-4 border-t bg-gray-50 dark:bg-gray-800/50">
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {T('Pressione Ctrl+Enter para enviar', 'Press Ctrl+Enter to send')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-lg h-full flex items-center justify-center">
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {T('Selecione um ticket para visualizar a conversa', 'Select a ticket to view the conversation')}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTicketsPage;

