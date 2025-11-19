import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, User, DollarSign, ArrowLeft, RefreshCw, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!appointmentId) {
      setIsLoading(false);
      toast.error("ID de agendamento inválido.");
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
        toast.error("Agendamento não encontrado.");
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
    return <div className="text-center p-10">Detalhes do agendamento não puderam ser carregados.</div>;
  }

  const startTime = new Date(appointment.start_time);
  const businessId = appointment.businesses.id;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardContent className="p-8 space-y-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-3xl font-bold text-gray-800">Agendamento Confirmado!</h1>
          <p className="text-lg text-gray-600">
            Obrigado, {appointment.client_name}. Seu horário foi reservado com sucesso.
          </p>

          <div className="space-y-3 text-left border-t pt-4">
            <h2 className="text-xl font-semibold mb-2">Detalhes:</h2>
            
            {appointment.client_code && (
                <div className="flex items-center text-sm">
                    <Tag className="h-4 w-4 mr-3 text-primary" />
                    <span className="font-medium">Código de Cliente:</span> <span className="font-bold ml-1">{appointment.client_code}</span>
                </div>
            )}

            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-3 text-primary" />
              <span className="font-medium">Data:</span> {format(startTime, 'EEEE, dd/MM/yyyy', { locale: ptBR })}
            </div>
            
            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 mr-3 text-primary" />
              <span className="font-medium">Hora:</span> {format(startTime, 'HH:mm', { locale: ptBR })} ({appointment.services.duration_minutes} min)
            </div>
            
            <div className="flex items-center text-sm">
              <DollarSign className="h-4 w-4 mr-3 text-primary" />
              <span className="font-medium">Serviço:</span> {appointment.services.name} ({formatCurrency(appointment.services.price)})
            </div>
            
            <div className="flex items-center text-sm">
              <User className="h-4 w-4 mr-3 text-primary" />
              <span className="font-medium">Negócio:</span> {appointment.businesses.name}
            </div>
          </div>

          <div className="flex flex-col space-y-3 pt-4">
            <Button asChild>
              <Link to={`/book/${businessId}`}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Agendar Novo Serviço
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar à Página Inicial
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmationPage;