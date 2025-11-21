import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Clock, CheckCircle, XCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

const TicketsPage: React.FC = () => {
  const { T } = useCurrency();
  const navigate = useNavigate();
  const { user } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user, filterStatus]);

  const fetchTickets = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[TICKETS] Erro ao buscar tickets:', error);
        // Se a tabela não existe (404), apenas mostrar array vazio
        if (error.code === 'PGRST205') {
          console.warn('[TICKETS] Tabela tickets não encontrada. Retornando array vazio.');
          setTickets([]);
          return;
        }
        toast.error(T('Erro ao carregar tickets.', 'Error loading tickets.'));
        setTickets([]);
        return;
      }

      setTickets(data || []);
    } catch (error: any) {
      console.error('[TICKETS] Erro inesperado:', error);
      toast.error(T('Erro ao carregar tickets.', 'Error loading tickets.'));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300"><AlertCircle className="h-3 w-3 mr-1" /> Aberto</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" /> Em Andamento</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" /> Resolvido</Badge>;
      case 'closed':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300"><XCircle className="h-3 w-3 mr-1" /> Fechado</Badge>;
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            {T('Tickets de Suporte', 'Support Tickets')}
          </h1>
          <p className="text-gray-600 mt-2">{T('Gerencie seus tickets de suporte', 'Manage your support tickets')}</p>
        </div>
        <Button 
          onClick={() => navigate('/dashboard/tickets/create')}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          {T('Criar Ticket', 'Create Ticket')}
        </Button>
      </div>

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

      {/* Lista de Tickets */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{T('Meus Tickets', 'My Tickets')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">{T('Nenhum ticket encontrado.', 'No tickets found.')}</p>
              <Button 
                onClick={() => navigate('/dashboard/tickets/create')}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                {T('Criar Primeiro Ticket', 'Create First Ticket')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/dashboard/tickets/${ticket.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{ticket.subject}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                        {getStatusBadge(ticket.status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketsPage;

