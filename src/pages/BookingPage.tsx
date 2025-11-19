import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, Clock, User, CheckCircle, MapPin, Phone, MessageSquare, Mail, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatCurrency } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, addMinutes, startOfToday, isSameDay, parseISO, setHours, setMinutes, isBefore, isAfter, isSameMinute } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverHeader, PopoverTrigger } from '@/components/ui/popover';

// Tipos de dados
interface DaySchedule {
  day: string;
  is_open: boolean;
  start_time: string;
  end_time: string;
}

interface Business {
  id: string;
  name: string;
  description: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  working_hours: DaySchedule[] | null;
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

// Componente de Seleção de Serviço (Melhorado)
const ServiceSelector: React.FC<{ services: Service[], selectedService: Service | null, onSelectService: (service: Service) => void }> = ({ services, selectedService, onSelectService }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">1. Escolha o Serviço</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {services.map((service) => (
        <Card
          key={service.id}
          className={cn(
            "cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/80 rounded-xl",
            selectedService?.id === service.id 
              ? "border-primary ring-2 ring-primary/20 shadow-lg scale-[1.01] bg-primary/5" 
              : "border-gray-200 bg-white"
          )}
          onClick={() => onSelectService(service)}
        >
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-gray-900">{service.name}</h3>
              <p className="text-xs text-muted-foreground">
                Duração: {service.duration_minutes} min
              </p>
            </div>
            <div className="mt-4 text-right">
              <span className="text-3xl font-extrabold text-green-600">
                {formatCurrency(service.price)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// Componente de Agendamento
const AppointmentScheduler: React.FC<{ 
  business: Business;
  selectedService: Service; 
  selectedDate: Date | undefined; 
  setSelectedDate: (date: Date | undefined) => void;
  selectedTime: string | null;
  setSelectedTime: (time: string | null) => void;
}> = ({ business, selectedService, selectedDate, setSelectedDate, selectedTime, setSelectedTime }) => {
  
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isTimesLoading, setIsTimesLoading] = useState(false);

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const fetchAvailableTimes = useCallback(async (date: Date) => {
    if (!business.working_hours) return;

    setIsTimesLoading(true);
    setAvailableTimes([]);
    setSelectedTime(null);

    const dayIndex = date.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const daySchedule = business.working_hours.find(d => d.day === dayNames[dayIndex]);

    if (!daySchedule || !daySchedule.is_open) {
      setIsTimesLoading(false);
      return;
    }

    const [startHour, startMinute] = daySchedule.start_time.split(':').map(Number);
    const [endHour, endMinute] = daySchedule.end_time.split(':').map(Number);
    const duration = selectedService.duration_minutes;

    let currentTime = setMinutes(setHours(date, startHour), startMinute);
    const endTimeLimit = setMinutes(setHours(date, endHour), endMinute);

    // 1. Buscar agendamentos existentes para o dia
    const startOfDay = format(date, 'yyyy-MM-dd 00:00:00');
    const endOfDay = format(date, 'yyyy-MM-dd 23:59:59');

    const { data: existingAppointments, error } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('business_id', business.id)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .in('status', ['pending', 'confirmed']); // Considerar pendentes e confirmados

    if (error) {
      toast.error("Erro ao carregar horários existentes.");
      console.error(error);
      setIsTimesLoading(false);
      return;
    }

    const occupiedSlots = existingAppointments.map(app => ({
      start: parseISO(app.start_time),
      end: parseISO(app.end_time),
    }));

    const newAvailableTimes: string[] = [];
    const now = new Date();

    while (isBefore(addMinutes(currentTime, duration), endTimeLimit) || isSameMinute(addMinutes(currentTime, duration), endTimeLimit)) {
      
      // 2. Verificar se o slot está no futuro (apenas para o dia de hoje)
      if (isSameDay(currentTime, now) && isBefore(currentTime, now)) {
        currentTime = addMinutes(currentTime, 30); // Avança para o próximo slot de 30 min
        continue;
      }

      const slotStart = currentTime;
      const slotEnd = addMinutes(currentTime, duration);
      let isAvailable = true;

      // 3. Verificar conflito com agendamentos existentes
      for (const occupied of occupiedSlots) {
        // Conflito se o novo slot começar durante um agendamento existente
        // OU se o novo slot terminar durante um agendamento existente
        // OU se o novo slot englobar um agendamento existente
        if (
          (isAfter(slotStart, occupied.start) && isBefore(slotStart, occupied.end)) ||
          (isAfter(slotEnd, occupied.start) && isBefore(slotEnd, occupied.end)) ||
          (isBefore(slotStart, occupied.start) && isAfter(slotEnd, occupied.end)) ||
          isSameMinute(slotStart, occupied.start) // Começa exatamente na mesma hora
        ) {
          isAvailable = false;
          break;
        }
      }

      if (isAvailable) {
        newAvailableTimes.push(format(slotStart, 'HH:mm'));
      }

      // Avança para o próximo slot (intervalo de 30 minutos)
      currentTime = addMinutes(currentTime, 30);
    }

    setAvailableTimes(newAvailableTimes);
    setIsTimesLoading(false);
  }, [business.id, business.working_hours, selectedService.duration_minutes, setSelectedTime]);

  useEffect(() => {
    if (selectedDate && business.working_hours && selectedService) {
      fetchAvailableTimes(selectedDate);
    }
  }, [selectedDate, business.working_hours, selectedService, fetchAvailableTimes]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">2. Escolha Data e Hora</h2>
      
      {/* Seleção de Data */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal h-12 text-base rounded-xl shadow-sm hover:shadow-md",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-5 w-5" />
            {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-xl shadow-lg">
          <ShadcnCalendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            locale={ptBR}
            // Desabilita datas passadas e domingos/dias fechados
            disabled={(date) => {
              const today = startOfToday();
              if (isBefore(date, today) && !isSameDay(date, today)) return true;
              
              if (business.working_hours) {
                const dayIndex = date.getDay();
                const daySchedule = business.working_hours.find(d => d.day === dayNames[dayIndex]);
                return !daySchedule?.is_open;
              }
              return false;
            }}
          />
        </PopoverContent>
      </Popover>

      {/* Seleção de Hora */}
      {selectedDate && (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-gray-700">Horários disponíveis:</h3>
            {isTimesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : availableTimes.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-1">
                {availableTimes.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    size="lg" // Botões maiores para mobile
                    className={cn(
                      "text-base h-10 rounded-lg transition-all",
                      selectedTime === time ? "bg-primary hover:bg-primary/90" : "hover:bg-gray-100"
                    )}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhum horário disponível neste dia.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Componente de Detalhes do Cliente
const ClientDetailsForm: React.FC<{ clientDetails: ClientDetails, setClientDetails: (details: ClientDetails) => void }> = ({ clientDetails, setClientDetails }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">3. Seus Dados</h2>
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="client_name" className="font-semibold">Nome Completo *</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            id="client_name" 
            value={clientDetails.client_name} 
            onChange={(e) => setClientDetails({ ...clientDetails, client_name: e.target.value })} 
            required 
            className="pl-10 h-12 rounded-xl text-base"
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <Label htmlFor="client_whatsapp" className="font-semibold">WhatsApp *</Label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            id="client_whatsapp" 
            value={clientDetails.client_whatsapp} 
            onChange={(e) => setClientDetails({ ...clientDetails, client_whatsapp: e.target.value })} 
            placeholder="(99) 99999-9999"
            required 
            className="pl-10 h-12 rounded-xl text-base"
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <Label htmlFor="client_email" className="font-semibold">E-mail (Opcional)</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            id="client_email" 
            type="email"
            value={clientDetails.client_email} 
            onChange={(e) => setClientDetails({ ...clientDetails, client_email: e.target.value })} 
            className="pl-10 h-12 rounded-xl text-base"
          />
        </div>
      </div>
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
      // Buscar dados do negócio (incluindo working_hours, logo, banner e phone)
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, description, address, phone, logo_url, cover_photo_url, working_hours')
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

  // Função para gerar link do Google Maps
  const getMapLink = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  // Função para gerar link do WhatsApp
  const getWhatsappLink = (phone: string) => {
    // Remove caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    // Formato internacional (assumindo Moçambique +258 ou Brasil +55, mas o link wa.me funciona com o número limpo)
    const whatsappNumber = cleanPhone;
    return `https://wa.me/${whatsappNumber}`;
  };

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
    let startTime = new Date(selectedDate);
    startTime = setHours(startTime, hours);
    startTime = setMinutes(startTime, minutes);
    startTime.setSeconds(0, 0); // Zera segundos e milissegundos

    // Calcula o tempo final
    const endTime = addMinutes(startTime, selectedService.duration_minutes);

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
  
  if (services.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Card className="mb-8 rounded-xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">{business.name}</CardTitle>
              <p className="text-gray-600">Agende seu horário de forma rápida e fácil.</p>
            </CardHeader>
          </Card>
          <Card className="p-6 text-center rounded-xl shadow-lg">
            <p className="text-muted-foreground">Desculpe, este negócio não possui serviços ativos para agendamento no momento.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Section */}
      {business.cover_photo_url && (
        <div 
          className="h-40 w-full bg-cover bg-center relative"
          style={{ backgroundImage: `url(${business.cover_photo_url})` }}
        >
          <div className="absolute inset-0 bg-black/30"></div>
        </div>
      )}

      <div className="max-w-5xl mx-auto p-4 md:p-8 -mt-12 relative z-10">
        {/* Business Header Card (Melhorado) */}
        <Card className="mb-8 p-4 rounded-xl shadow-xl border-t-4 border-primary">
          <CardHeader className="flex flex-col md:flex-row items-center md:items-start space-y-3 md:space-y-0 md:space-x-4 p-0">
            {business.logo_url && (
              <img 
                src={business.logo_url} 
                alt={`${business.name} Logo`} 
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md flex-shrink-0"
              />
            )}
            <div className="text-center md:text-left flex-grow">
              <CardTitle className="text-3xl md:text-4xl font-extrabold text-gray-900">{business.name}</CardTitle>
              <p className="text-md text-gray-600 mt-1 max-w-xl">
                {business.description || "Organize sua agenda de forma simples e eficaz."}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 flex flex-col md:flex-row items-center md:justify-start">
            {business.address && (
              <a 
                href={getMapLink(business.address)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground flex items-center hover:text-primary transition-colors font-medium md:mr-4"
              >
                <MapPin className="h-4 w-4 mr-2 text-red-500"/> 
                {business.address} (Ver no Mapa)
              </a>
            )}
            {business.phone && (
              <Button 
                asChild 
                className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white transition-colors shadow-md h-9 text-sm rounded-lg"
                size="default"
              >
                <a href={getWhatsappLink(business.phone)} target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Falar no WhatsApp
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna de Seleção */}
          <div className="lg:col-span-2 space-y-8">
            
            <ServiceSelector 
              services={services} 
              selectedService={selectedService} 
              onSelectService={(service) => {
                setSelectedService(service);
                setSelectedTime(null); // Reset time when service changes
              }} 
            />

            {selectedService && business.working_hours && (
              <AppointmentScheduler 
                business={business}
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
            <Card className="sticky top-8 rounded-xl shadow-xl border-2 border-gray-100">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-primary">Resumo do Agendamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedService ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-base">
                        <span className="font-bold text-gray-700 flex items-center"><Briefcase className="h-4 w-4 mr-2 text-primary" /> Serviço:</span>
                        <span className="text-primary font-extrabold">{selectedService.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center"><Clock className="h-4 w-4 mr-2" /> Duração:</span>
                        <span>{selectedService.duration_minutes} minutos</span>
                      </div>
                    </div>
                    
                    <Separator />

                    <div className="flex items-center justify-between text-xl font-extrabold pt-2">
                      <span>Preço Total:</span>
                      <span className="text-green-600">
                        {formatCurrency(selectedService.price)}
                      </span>
                    </div>
                    <Separator />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-2 text-center">Selecione um serviço para ver o resumo.</p>
                )}

                {selectedDate && selectedTime && (
                  <div className="space-y-2">
                    <div className="flex items-center text-base">
                      <Calendar className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">Data:</span> {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                    <div className="flex items-center text-base">
                      <Clock className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">Hora:</span> {selectedTime}
                    </div>
                    <Separator />
                  </div>
                )}

                {clientDetails.client_name && (
                  <div className="space-y-2">
                    <div className="flex items-center text-base">
                      <User className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">Cliente:</span> {clientDetails.client_name}
                    </div>
                    <Separator />
                  </div>
                )}

                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white transition-all duration-300 shadow-lg h-12 text-lg rounded-xl hover:shadow-xl" 
                  size="lg" 
                  onClick={handleBooking} 
                  disabled={!selectedService || !selectedDate || !selectedTime || !clientDetails.client_name || !clientDetails.client_whatsapp || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
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