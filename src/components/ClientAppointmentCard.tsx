import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClientAppointment } from '@/hooks/use-client-appointments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Star, MapPin, ExternalLink, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/utils';

interface ClientAppointmentCardProps {
  appointment: ClientAppointment;
  onRateClick?: (appointment: ClientAppointment) => void;
}

export function ClientAppointmentCard({ appointment, onRateClick }: ClientAppointmentCardProps) {
  const { T, currentCurrency } = useCurrency();
  const startTime = new Date(appointment.start_time);
  const canRate = appointment.status === 'completed' && !appointment.is_rated;

  const bookingUrl = appointment.businesses.slug
    ? `/book/${appointment.businesses.slug}`
    : `/book/${appointment.businesses.id}`;

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'confirmed':
        return 'default';
      case 'cancelled':
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed':
        return T('Concluído', 'Completed');
      case 'confirmed':
        return T('Confirmado', 'Confirmed');
      case 'cancelled':
        return T('Cancelado', 'Cancelled');
      case 'rejected':
        return T('Rejeitado', 'Rejected');
      default:
        return T('Pendente', 'Pending');
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all border border-gray-200">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Logo do Negócio */}
          <div className="flex-shrink-0">
            {appointment.businesses.logo_url ? (
              <img
                src={appointment.businesses.logo_url}
                alt={appointment.businesses.name}
                className="w-20 h-20 rounded-xl object-cover border-2 border-gray-100"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center border-2 border-gray-100"
                style={{
                  backgroundColor: appointment.businesses.theme_color || '#2563eb',
                }}
              >
                <span className="text-white font-bold text-2xl">
                  {appointment.businesses.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Informações do Agendamento */}
          <div className="flex-1 min-w-0">
            {/* Nome do Negócio e Status */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-bold text-lg text-gray-900 uppercase leading-tight">
                {appointment.businesses.name}
              </h3>
              <Badge 
                variant={getStatusVariant(appointment.status)}
                className="flex-shrink-0 text-xs px-2 py-1"
              >
                {getStatusLabel(appointment.status)}
              </Badge>
            </div>

            {/* Detalhes do Agendamento */}
            <div className="space-y-2.5 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="font-medium">
                  {format(startTime, 'EEEE, dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span>
                  {format(startTime, 'HH:mm', { locale: ptBR })} - {format(new Date(appointment.end_time), 'HH:mm', { locale: ptBR })}
                </span>
                <span className="text-xs text-gray-500 ml-1">
                  ({appointment.services.duration_minutes} {T('min', 'min')})
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span>{appointment.services.name}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-700">
                <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="font-semibold text-gray-900">
                  {formatCurrency(appointment.services.price, currentCurrency.key, currentCurrency.locale)}
                </span>
              </div>

              {appointment.client_code && (
                <div className="text-xs text-gray-500 pt-1">
                  {T('Código:', 'Code:')} <span className="font-mono font-semibold">{appointment.client_code}</span>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-2">
              {canRate && onRateClick && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onRateClick(appointment)}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-medium"
                >
                  <Star className="h-4 w-4 mr-2 fill-white" />
                  {T('Avaliar', 'Rate')}
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                asChild
                className="flex-1 border-gray-300 hover:bg-gray-50"
              >
                <Link to={bookingUrl}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {T('Agendar Novamente', 'Book Again')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

