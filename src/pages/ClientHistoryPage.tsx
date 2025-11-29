import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ClientAppointmentCard } from '@/components/ClientAppointmentCard';
import { BusinessRating } from '@/components/BusinessRating';
import { useClientAppointments, AppointmentStatus } from '@/hooks/use-client-appointments';
import { useSession } from '@/integrations/supabase/session-context';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Loader2, Search, Filter, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClientAppointment } from '@/hooks/use-client-appointments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

export default function ClientHistoryPage() {
  const { user } = useSession();
  const { T } = useCurrency();
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<ClientAppointment | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);

  const { appointments, isLoading, error, canRateCount, refresh } = useClientAppointments({
    status: selectedStatus,
    searchQuery: searchQuery.trim() || undefined,
  });

  const handleRateClick = (appointment: ClientAppointment) => {
    setSelectedAppointment(appointment);
    setShowRatingDialog(true);
  };

  const handleRatingSubmitted = async () => {
    if (!selectedAppointment) return;

    try {
      // Marcar agendamento como avaliado
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ is_rated: true })
        .eq('id', selectedAppointment.id);

      if (updateError) {
        console.error('Erro ao marcar como avaliado:', updateError);
        toast.error(T('Erro ao atualizar agendamento.', 'Error updating appointment.'));
        return;
      }

      // Atualizar lista
      await refresh();
      
      setShowRatingDialog(false);
      setSelectedAppointment(null);
      toast.success(T('Avaliação enviada com sucesso!', 'Rating submitted successfully!'));
    } catch (err) {
      console.error('Erro ao processar avaliação:', err);
      toast.error(T('Erro ao processar avaliação.', 'Error processing rating.'));
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-gray-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">{T('Meu Histórico de Agendamentos', 'My Appointment History')}</h1>
          <p className="text-gray-300">
            {T('Visualize e gerencie todos os seus agendamentos', 'View and manage all your appointments')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 pb-20 md:pb-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {T('Filtros', 'Filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={T('Buscar por nome do negócio...', 'Search by business name...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as AppointmentStatus | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder={T('Todos os status', 'All statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{T('Todos', 'All')}</SelectItem>
                  <SelectItem value="pending">{T('Pendentes', 'Pending')}</SelectItem>
                  <SelectItem value="confirmed">{T('Confirmados', 'Confirmed')}</SelectItem>
                  <SelectItem value="completed">{T('Concluídos', 'Completed')}</SelectItem>
                  <SelectItem value="cancelled">{T('Cancelados', 'Cancelled')}</SelectItem>
                  <SelectItem value="rejected">{T('Rejeitados', 'Rejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pending Ratings Badge */}
            {canRateCount > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-muted-foreground">
                    {canRateCount} {canRateCount === 1 
                      ? T('agendamento aguardando avaliação', 'appointment waiting for rating')
                      : T('agendamentos aguardando avaliação', 'appointments waiting for rating')}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">{T('Erro ao carregar agendamentos.', 'Error loading appointments.')}</p>
            </CardContent>
          </Card>
        ) : appointments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg mb-2">
                {T('Nenhum agendamento encontrado.', 'No appointments found.')}
              </p>
              <Button variant="outline" asChild className="mt-4">
                <a href="/marketplace">{T('Explorar Marketplace', 'Explore Marketplace')}</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {appointments.length} {appointments.length === 1 
                  ? T('agendamento encontrado', 'appointment found')
                  : T('agendamentos encontrados', 'appointments found')}
              </p>
            </div>
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <ClientAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onRateClick={handleRateClick}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {T('Avaliar Negócio', 'Rate Business')}
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">{selectedAppointment.businesses.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedAppointment.services.name}
                </p>
              </div>
              <BusinessRating
                businessId={selectedAppointment.business_id}
                onRatingSubmitted={handleRatingSubmitted}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

