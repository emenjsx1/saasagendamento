import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, User, DollarSign, ArrowLeft, RefreshCw, Tag, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useSession } from '@/integrations/supabase/session-context';

interface AppointmentDetails {
  id: string;
  client_name: string;
  client_code: string; // Novo campo
  start_time: string;
  status: string;
  services: {
    name: string;
    price: number;
    duration_minutes: number;
  };
  businesses: {
    id: string;
    name: string;
  };
}

const ConfirmationPage = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useSession();
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentCurrency, T } = useCurrency();

  useEffect(() => {
      if (!appointmentId) {
        setIsLoading(false);
        toast.error(T("ID de agendamento inválido.", "Invalid appointment ID."));
        return;
      }

    const fetchAppointment = async () => {
      // Nota: Usamos .select('*') e 'services(*), businesses(id, name)' para fazer o join
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          client_name,
          client_code,
          start_time,
          status,
          services (name, price, duration_minutes),
          businesses (id, name)
        `)
        .eq('id', appointmentId)
        .single();

      if (error || !data) {
        toast.error(T("Agendamento não encontrado.", "Appointment not found."));
        console.error(error);
      } else {
        // Garantir que o objeto services não seja um array (resultado de join)
        const mappedData = {
            ...data,
            services: Array.isArray(data.services) ? data.services[0] : data.services,
        } as AppointmentDetails;
        
        setAppointment(mappedData);
      }
      setIsLoading(false);
    };

    fetchAppointment();
  }, [appointmentId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!appointment) {
    return <div className="text-center p-10">{T('Detalhes do agendamento não puderam ser carregados.', 'Appointment details could not be loaded.')}</div>;
  }

  const startTime = new Date(appointment.start_time);
  const businessId = appointment.businesses.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal - Confirmação */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-md border border-gray-200">
              <CardContent className="p-8">
                <div className="flex justify-center mb-6">
                  <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  </div>
                </div>
                
                <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
                  {T('Agendamento Confirmado!', 'Appointment Confirmed!')}
                </h1>
                
                <p className="text-lg text-center text-gray-600 mb-8">
                  {T('Obrigado, ', 'Thank you, ')}<strong>{appointment.client_name}</strong>. {T('Seu horário foi reservado com sucesso.', 'Your appointment has been successfully reserved.')}
                </p>

                <div className="space-y-4 border-t pt-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">{T('Detalhes do Agendamento', 'Appointment Details')}</h2>
                  
                  {appointment.client_code && (
                    <div className="flex items-center text-sm bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <Tag className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                      <div>
                        <span className="font-medium text-gray-700">{T('Código de Cliente:', 'Client Code:')}</span>
                        <span className="font-bold ml-2 text-primary">{appointment.client_code}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center text-sm bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <Calendar className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">{T('Data:', 'Date:')}</span>
                      <span className="ml-2">{format(startTime, 'EEEE, dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <Clock className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">{T('Hora:', 'Time:')}</span>
                      <span className="ml-2">{format(startTime, 'HH:mm', { locale: ptBR })} ({appointment.services.duration_minutes} {T('min', 'min')})</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <DollarSign className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">{T('Serviço:', 'Service:')}</span>
                      <span className="ml-2">{appointment.services.name} - {formatCurrency(appointment.services.price, currentCurrency.key, currentCurrency.locale)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <User className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">{T('Negócio:', 'Business:')}</span>
                      <span className="ml-2">{appointment.businesses.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-3 pt-6 mt-6 border-t">
                  {user && (
                    <Button variant="outline" asChild className="w-full h-11 border-gray-300">
                      <Link to="/client/history">
                        <History className="h-4 w-4 mr-2" />
                        {T('Ver Meu Histórico', 'View My History')}
                      </Link>
                    </Button>
                  )}
                  <Button asChild className="w-full h-11 bg-black hover:bg-black/90 text-white">
                    <Link to={`/book/${businessId}`}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {T('Agendar Novo Serviço', 'Schedule New Service')}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full h-11 border-gray-300">
                    <Link to="/">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {T('Voltar à Página Inicial', 'Back to Home')}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral - Resumo (similar ao BookingPage) */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 shadow-md border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">{T('Resumo', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 pb-4 border-b">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{appointment.services.name}</span>
                    <span className="font-medium">{formatCurrency(appointment.services.price, currentCurrency.key, currentCurrency.locale)}</span>
                  </div>
                  <div className="text-xs text-gray-500">{appointment.services.duration_minutes} {T('min', 'min')}</div>
                </div>
                
                <div className="space-y-2 pb-4 border-b text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{T('Data', 'Date')}</span>
                    <span>{format(startTime, 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{T('Hora', 'Time')}</span>
                    <span>{format(startTime, 'HH:mm', { locale: ptBR })}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold">{T('Total', 'Total')}</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(appointment.services.price, currentCurrency.key, currentCurrency.locale)}
                    </span>
                  </div>
                  
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <p className="text-sm font-medium text-green-800">
                        {T('Agendamento Confirmado', 'Appointment Confirmed')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;