import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useClients } from '@/hooks/use-clients';
import { useClientInteractions } from '@/hooks/use-client-interactions';
import { useBusiness } from '@/hooks/use-business';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Edit, Mail, Phone, MapPin, Tag, Calendar, MessageSquare, DollarSign, FileText, Plus, TrendingUp } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClientForm } from '@/components/ClientForm';
import { InteractionModal } from '@/components/InteractionModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { businessId } = useBusiness();
  const { T, currentCurrency } = useCurrency();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [clientStats, setClientStats] = useState<{
    totalAppointments: number;
    totalSpent: number;
    lastInteraction: string | null;
  } | null>(null);

  const { clients, isLoading: isLoadingClients } = useClients({
    businessId: businessId || undefined,
  });

  const client = clients.find(c => c.id === id);

  const { interactions, isLoading: isLoadingInteractions, createInteraction } = useClientInteractions({
    clientId: id,
  });

  // Buscar estatísticas do cliente
  useEffect(() => {
    const fetchClientStats = async () => {
      if (!id || !businessId || !client) return;

      try {
        // Buscar TODOS os agendamentos do cliente (por nome, email ou whatsapp)
        let appointmentQuery = supabase
          .from('appointments')
          .select(`
            id,
            services!inner(id, name, price),
            status,
            start_time
          `)
          .eq('business_id', businessId);

        // Construir filtro para encontrar agendamentos do cliente
        const filters: string[] = [];
        if (client.name) {
          filters.push(`client_name.eq.${client.name}`);
        }
        if (client.email) {
          filters.push(`client_email.eq.${client.email}`);
        }
        if (client.whatsapp) {
          filters.push(`client_whatsapp.eq.${client.whatsapp}`);
        }

        if (filters.length > 0) {
          appointmentQuery = appointmentQuery.or(filters.join(','));
        } else {
          // Se não tiver dados para buscar, retornar zero
          setClientStats({
            totalAppointments: 0,
            totalSpent: 0,
            lastInteraction: interactions && interactions.length > 0 ? interactions[0].created_at : null,
          });
          return;
        }

        const { data: appointments, error: appointmentsError } = await appointmentQuery;

        if (appointmentsError) {
          console.error('Erro ao buscar agendamentos:', appointmentsError);
        }

        // Calcular total de agendamentos e valor gasto
        const totalAppointments = appointments?.length || 0;
        
        // Somar preços dos serviços de TODOS os agendamentos (confirmados ou completados)
        // Cliente "gastou" quando confirmou o agendamento, não apenas quando completou
        let totalSpent = 0;
        if (appointments && appointments.length > 0) {
          totalSpent = appointments
            .filter(a => a.status === 'confirmed' || a.status === 'completed')
            .reduce((sum, a) => {
              const service = Array.isArray(a.services) ? a.services[0] : a.services;
              const price = Number(service?.price) || 0;
              return sum + price;
            }, 0);
        }

        // Buscar pagamentos através das interações
        const paymentInteractions = interactions?.filter(i => i.interaction_type === 'payment') || [];
        const paymentIds = paymentInteractions
          .map(i => i.payment_id)
          .filter((id): id is string => id !== null);

        if (paymentIds.length > 0) {
          const { data: payments } = await supabase
            .from('payments')
            .select('amount')
            .in('id', paymentIds)
            .eq('status', 'confirmed');

          const paymentsTotal = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
          totalSpent += paymentsTotal;
        }

        const lastInteraction = interactions && interactions.length > 0 
          ? interactions[0].created_at 
          : null;

        setClientStats({
          totalAppointments,
          totalSpent,
          lastInteraction,
        });
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
      }
    };

    if (client && interactions) {
      fetchClientStats();
    }
  }, [id, businessId, client, interactions]);

  if (isLoadingClients) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600">
              {T('Cliente não encontrado', 'Client not found')}
            </p>
            <Button asChild className="mt-4 rounded-2xl">
              <Link to="/dashboard/clients">
                {T('Voltar para Clientes', 'Back to Clients')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    <div className="space-y-6 p-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-2xl">
          <Link to="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold">{client.name}</h1>
          <p className="text-gray-500 mt-1">
            {T('Cliente desde', 'Client since')} {format(new Date(client.created_at), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          {id && (
            <>
              <Button 
                variant="outline" 
                className="rounded-2xl"
                onClick={() => setIsInteractionModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {T('Nova Interação', 'New Interaction')}
              </Button>
              <InteractionModal
                open={isInteractionModalOpen}
                onOpenChange={setIsInteractionModalOpen}
                clientId={id}
                onSuccess={() => {
                  // Recarregar interações
                  window.location.reload();
                }}
              />
            </>
          )}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl">
                <Edit className="h-4 w-4 mr-2" />
                {T('Editar', 'Edit')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{T('Editar Cliente', 'Edit Client')}</DialogTitle>
              </DialogHeader>
              <ClientForm
                client={client}
                onSuccess={() => setIsEditModalOpen(false)}
                onCancel={() => setIsEditModalOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Cliente */}
        <div className="lg:col-span-1 space-y-6">
          {/* Estatísticas */}
          {clientStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {T('Estatísticas', 'Statistics')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{T('Total de Agendamentos', 'Total Appointments')}</p>
                  <p className="text-2xl font-bold">{clientStats.totalAppointments}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">{T('Valor Total Gasto', 'Total Spent')}</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(clientStats.totalSpent, currentCurrency.key, currentCurrency.locale)}
                  </p>
                </div>
                {clientStats.lastInteraction && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{T('Última Interação', 'Last Interaction')}</p>
                    <p className="text-sm">
                      {format(new Date(clientStats.lastInteraction), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{T('Informações', 'Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">{T('Status', 'Status')}</p>
                <Badge 
                  variant={
                    client.status === 'active' ? 'default' :
                    client.status === 'inactive' ? 'secondary' : 'destructive'
                  }
                  className="rounded-full"
                >
                  {client.status === 'active' ? T('Ativo', 'Active') :
                   client.status === 'inactive' ? T('Inativo', 'Inactive') :
                   T('Bloqueado', 'Blocked')}
                </Badge>
              </div>

              {client.email && (
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {T('Email', 'Email')}
                  </p>
                  <p className="text-sm">{client.email}</p>
                </div>
              )}

              {(client.phone || client.whatsapp) && (
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {T('Telefone', 'Phone')}
                  </p>
                  <p className="text-sm">{client.whatsapp || client.phone}</p>
                </div>
              )}

              {client.address && (
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {T('Endereço', 'Address')}
                  </p>
                  <p className="text-sm">{client.address}</p>
                </div>
              )}

              {client.tags && client.tags.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {T('Tags', 'Tags')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {client.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="rounded-full">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {client.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">{T('Notas', 'Notes')}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Interações */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{T('Histórico de Interações', 'Interaction History')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingInteractions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : interactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>{T('Nenhuma interação registrada', 'No interactions recorded')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interactions.map((interaction) => (
                    <div
                      key={interaction.id}
                      className="flex gap-4 p-4 border rounded-2xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {getInteractionIcon(interaction.interaction_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <div>
                            <h4 className="font-semibold">
                              {interaction.title || getInteractionLabel(interaction.interaction_type)}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {getInteractionLabel(interaction.interaction_type)}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400 whitespace-nowrap">
                            {format(new Date(interaction.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                        {interaction.description && (
                          <p className="text-sm text-gray-600 mt-2">{interaction.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

