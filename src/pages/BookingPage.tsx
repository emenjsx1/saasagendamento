import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, Clock, User, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Tipos de dados
interface Business {
  id: string;
  name: string;
  description: string;
  address: string;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface ClientDetails {
  client_name: string;
  client_whatsapp: string;
  client_email: string;
}

// Componente de Seleção de Serviço
const ServiceSelector: React.FC<{ services: Service[], selectedService: Service | null, onSelectService: (service: Service) => void }> = ({ services, selectedService, onSelectService }) => (
  <div className="space-y-4">
    <h2 className="text-xl font-semibold">1. Escolha o Serviço</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map((service) => (
        <Card
          key={service.id}
          className={cn(
            "cursor-pointer transition-all hover:border-primary",
            selectedService?.id === service.id && "border-primary ring-2 ring-primary/50"
          )}
          onClick={() => onSelectService(service)}
        >
          <CardContent className="p-4">
            <h3 className="font-bold">{service.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {service.duration_minutes} min - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// Componente de Agendamento (Simplificado para MVP)
const AppointmentScheduler: React.FC<{ 
  selectedService: Service; 
  selectedDate: Date | undefined; 
  setSelectedDate: (date: Date | undefined) => void;
  selectedTime: string | null;
  setSelectedTime: (time: string | null) => void;
}> = ({ selectedService, selectedDate, setSelectedDate, selectedTime, setSelectedTime }) => {
  
  // Geração de horários disponíveis (Mockup simples: 9h às 17h, a cada 30 min)
  const generateAvailableTimes = () => {
    const times: string[] = [];
    for (let h = 9; h <= 17; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        // Em um app real, aqui você verificaria a disponibilidade no banco de dados
        times.push(time);
      }
    }
    return times;
  };

  const availableTimes = generateAvailableTimes();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">2. Escolha Data e Hora</h2>
      
      {/* Seleção de Data */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <ShadcnCalendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            initialFocus
            locale={ptBR}
            disabled={(date) => date < startOfToday()}
          />
        </PopoverContent>
      </Popover>

      {/* Seleção de Hora */}
      {selectedDate && (
        <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
          {availableTimes.map((time) => (
            <Button
              key={time}
              variant={selectedTime === time ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTime(time)}
            >
              {time}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

// Componente de Detalhes do Cliente
const ClientDetailsForm: React.FC<{ clientDetails: ClientDetails, setClientDetails: (details: ClientDetails) => void }> = ({ clientDetails, setClientDetails }) => (
  <div className="space-y-4">
    <h2 className="text-xl font-semibold">3. Seus Dados</h2>
    <div className="space-y-3">
      <Label htmlFor="client_name">Nome Completo *</Label>
      <Input 
        id="client_name" 
        value={clientDetails.client_name} 
        onChange={(e) => setClientDetails({ ...clientDetails, client_name: e.target.value })} 
        required 
      />
      
      <Label htmlFor="client_whatsapp">WhatsApp *</Label>
      <Input 
        id="client_whatsapp" 
        value={clientDetails.client_whatsapp} 
        onChange={(e) => setClientDetails({ ...clientDetails, client_whatsapp: e.target.value })} 
        placeholder="(99) 99999-9999"
        required 
      />
      
      <Label htmlFor="client_email">E-mail (Opcional)</Label>
      <Input 
        id="client_email" 
        type="email"
        value={clientDetails.client_email} 
        onChange={(e) => setClientDetails({ ...clientDetails, client_email: e.target.value })} 
      />
    </div>
  </div>
);


const BookingPage = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado do Agendamento
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails>({
    client_name: '',
    client_whatsapp: '',
    client_email: '',
  });

  // 1. Carregar dados do negócio e serviços
  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      toast.error("ID do negócio inválido.");
      return;
    }

    const fetchData = async () => {
      // Buscar dados do negócio
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, description, address')
        .eq('id', businessId)
        .single();

      if (businessError || !businessData) {
        toast.error("Negócio não encontrado ou erro ao carregar.");
        console.error(businessError);
        setIsLoading(false);
        return;
      }
      setBusiness(businessData as Business);

      // Buscar serviços
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, duration_minutes, price')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (servicesError) {
        toast.error("Erro ao carregar serviços.");
        console.error(servicesError);
      } else {
        setServices(servicesData as Service[]);
      }
      
      setIsLoading(false);
    };

    fetchData();
  }, [businessId]);

  // 2. Função de Agendamento
  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error("Por favor, selecione o serviço, data e hora.");
      return;
    }
    if (!clientDetails.client_name || !clientDetails.client_whatsapp) {
      toast.error("Nome e WhatsApp são obrigatórios.");
      return;
    }

    setIsSubmitting(true);

    // Combina data e hora para criar o timestamp de início
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);

    // Calcula o tempo final
    const endTime = addDays(startTime, 0); // Copia a data
    endTime.setMinutes(startTime.getMinutes() + selectedService.duration_minutes);

    const appointmentData = {
      business_id: businessId,
      service_id: selectedService.id,
      client_name: clientDetails.client_name,
      client_whatsapp: clientDetails.client_whatsapp,
      client_email: clientDetails.client_email || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'pending', // Começa como pendente
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select('id')
      .single();

    setIsSubmitting(false);

    if (error) {
      toast.error("Erro ao finalizar agendamento: " + error.message);
      console.error(error);
    } else {
      toast.success("Agendamento realizado com sucesso!");
      navigate(`/confirmation/${data.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!business) {
    return <div className="text-center p-10">Negócio não encontrado.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Business Header */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl text-primary">{business.name}</CardTitle>
            <p className="text-gray-600">{business.description || "Agende seu horário de forma rápida e fácil."}</p>
          </CardHeader>
          <CardContent>
            {business.address && <p className="text-sm text-muted-foreground flex items-center"><MapPin className="h-4 w-4 mr-2"/> {business.address}</p>}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna de Seleção */}
          <div className="lg:col-span-2 space-y-8">
            
            {services.length > 0 ? (
              <ServiceSelector 
                services={services} 
                selectedService={selectedService} 
                onSelectService={setSelectedService} 
              />
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">Nenhum serviço ativo encontrado para este negócio.</p>
              </Card>
            )}

            {selectedService && (
              <AppointmentScheduler 
                selectedService={selectedService}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedTime={selectedTime}
                setSelectedTime={setSelectedTime}
              />
            )}

            {selectedService && selectedDate && selectedTime && (
              <ClientDetailsForm 
                clientDetails={clientDetails}
                setClientDetails={setClientDetails}
              />
            )}
          </div>

          {/* Coluna de Resumo */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-xl">Resumo do Agendamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedService ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Serviço:</span>
                      <span className="text-primary">{selectedService.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Duração:</span>
                      <span>{selectedService.duration_minutes} minutos</span>
                    </div>
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Preço Total:</span>
                      <span className="text-green-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedService.price)}
                      </span>
                    </div>
                    <Separator />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Selecione um serviço para continuar.</p>
                )}

                {selectedDate && selectedTime && (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">Data:</span> {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">Hora:</span> {selectedTime}
                    </div>
                    <Separator />
                  </div>
                )}

                {clientDetails.client_name && (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">Cliente:</span> {clientDetails.client_name}
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={handleBooking} 
                  disabled={!selectedService || !selectedDate || !selectedTime || !clientDetails.client_name || !clientDetails.client_whatsapp || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar Agendamento
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;