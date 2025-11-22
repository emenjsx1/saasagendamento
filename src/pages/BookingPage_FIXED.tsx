import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, Clock, User, CheckCircle, MapPin, Phone, MessageSquare, Mail, Briefcase, Lock, CreditCard, ExternalLink } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateClientCode } from '@/utils/client-code-generator';
import { useEmailNotifications } from '@/hooks/use-email-notifications'; 
import { useEmailTemplates } from '@/hooks/use-email-templates';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Currency } from '@/utils/currency';
import { usePublicSettings } from '@/hooks/use-public-settings';

// Tipos de dados
interface DaySchedule {
  day: string;
  is_open: boolean;
  start_time: string;
  end_time: string;
}

interface Business {
  id: string; // Still need the UUID for foreign keys
  owner_id: string; // Adicionado owner_id
  name: string;
  description: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  working_hours: DaySchedule[] | null;
  theme_color: string | null; 
  instagram_url: string | null; 
  facebook_url: string | null; 
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


// Componente de Seleção de Serviço (Usando Select para melhor escalabilidade)
const ServiceSelector: React.FC<{ 
  services: Service[], 
  selectedService: Service | null, 
  onSelectService: (service: Service | null) => void,
  themeColor: string,
  currentCurrency: Currency,
  T: (pt: string, en: string) => string,
}> = ({ services, selectedService, onSelectService, themeColor, currentCurrency, T }) => {
  
  const handleSelectChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId) || null;
    onSelectService(service);
  };

  return (
    <Card className="shadow-md border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{T('1. Escolha o Serviço', '1. Choose Service')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Select onValueChange={handleSelectChange} value={selectedService?.id || ""}>
          <SelectTrigger className="w-full h-11">
            <SelectValue placeholder={T('Selecione um serviço...', 'Select a service...')} />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                <div className="flex justify-between items-center w-full gap-4">
                  <div>
                    <span className="font-medium">{service.name}</span>
                    <span className="ml-2 text-sm text-gray-500">({service.duration_minutes} {T('min', 'min')})</span>
                  </div>
                  <span className="font-semibold" style={{ color: themeColor }}>{formatCurrency(service.price, currentCurrency.key, currentCurrency.locale)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};

// Componente de Agendamento
const AppointmentScheduler: React.FC<{ 
  business: Business;
  selectedService: Service; 
  selectedDate: Date | undefined; 
  setSelectedDate: (date: Date | undefined) => void;
  selectedTime: string | null;
  setSelectedTime: (time: string | null) => void;
  themeColor: string;
  T: (pt: string, en: string) => string;
}> = ({ business, selectedService, selectedDate, setSelectedDate, selectedTime, setSelectedTime, themeColor, T }) => {
  
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
      console.error('[BOOKING] Erro ao buscar agendamentos existentes:', error);
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
    <Card className="shadow-md border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{T('2. Escolha Data e Hora', '2. Choose Date and Time')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seleção de Data */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal h-11",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>{T('Selecione uma data', 'Select a date')}</span>}
            </Button>
          </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <ShadcnCalendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            locale={ptBR}
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
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">{T('Horários disponíveis', 'Available times')}</p>
            {isTimesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: themeColor }} />
              </div>
            ) : availableTimes.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {availableTimes.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    size="sm"
                    className={cn("h-10 font-medium")}
                    style={selectedTime === time ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">{T('Nenhum horário disponível.', 'No available times.')}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Componente de Detalhes do Cliente
const ClientDetailsForm: React.FC<{ clientDetails: ClientDetails, setClientDetails: (details: ClientDetails) => void, T: (pt: string, en: string) => string }> = ({ clientDetails, setClientDetails, T }) => (
  <Card className="shadow-md border border-gray-200">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg font-semibold">{T('3. Seus Dados', '3. Your Details')}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div>
        <Label htmlFor="client_name" className="text-sm font-medium">
          {T('Nome Completo', 'Full Name')} *
        </Label>
        <Input 
          id="client_name" 
          value={clientDetails.client_name} 
          onChange={(e) => setClientDetails({ ...clientDetails, client_name: e.target.value })} 
          required 
          className="mt-1 h-11"
          placeholder={T('Digite seu nome completo', 'Enter your full name')}
        />
      </div>
      
      <div>
        <Label htmlFor="client_whatsapp" className="text-sm font-medium">
          WhatsApp *
        </Label>
        <Input 
          id="client_whatsapp" 
          value={clientDetails.client_whatsapp} 
          onChange={(e) => setClientDetails({ ...clientDetails, client_whatsapp: e.target.value })} 
          placeholder="841234567"
          required 
          className="mt-1 h-11"
        />
        <p className="text-xs text-gray-500 mt-1">{T('Digite apenas números (9 dígitos)', 'Enter numbers only (9 digits)')}</p>
      </div>
      
      <div>
        <Label htmlFor="client_email" className="text-sm font-medium">
          {T('E-mail (Opcional)', 'Email (Optional)')}
        </Label>
        <Input 
          id="client_email" 
          type="email"
          value={clientDetails.client_email} 
          onChange={(e) => setClientDetails({ ...clientDetails, client_email: e.target.value })} 
          className="mt-1 h-11"
          placeholder="seu@email.com"
        />
        <p className="text-xs text-gray-500 mt-1">{T('Recomendado para receber confirmações', 'Recommended to receive confirmations')}</p>
      </div>
    </CardContent>
  </Card>
);


const BookingPage = () => {
  const { businessId: businessSlug } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { sendEmail } = useEmailNotifications(); 
  const { templates, isLoading: isTemplatesLoading } = useEmailTemplates();
  const { currentCurrency, T } = useCurrency();
  const { subscriptionConfig } = usePublicSettings();
  
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
    if (!businessSlug) {
      setIsLoading(false);
      toast.error(T("ID do negócio inválido.", "Invalid business ID."));
      return;
    }

    const fetchData = async () => {
      console.log('[BOOKING] 🔍 Iniciando busca de dados do negócio. Slug recebido:', businessSlug);
      
      try {
        // Buscar dados do negócio USANDO O SLUG
        console.log('[BOOKING] 📡 Buscando negócio pelo slug:', businessSlug);
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id, owner_id, name, description, address, phone, logo_url, cover_photo_url, working_hours, theme_color, instagram_url, facebook_url')
          .eq('slug', businessSlug)
          .maybeSingle();

        if (businessError) {
          console.error('[BOOKING] ❌ Erro ao buscar negócio:', {
            code: businessError.code,
            message: businessError.message,
            details: businessError.details,
            hint: businessError.hint,
          });
          toast.error(
            T(
              "Erro ao carregar dados do negócio. Tente novamente mais tarde.",
              "Error loading business data. Please try again later."
            )
          );
          setIsLoading(false);
          return;
        }

        if (!businessData) {
          console.warn('[BOOKING] ⚠️ Negócio não encontrado para o slug:', businessSlug);
          toast.error(
            T(
              `Negócio não encontrado para "${businessSlug}". Verifique o link e tente novamente.`,
              `Business not found for "${businessSlug}". Please check the link and try again.`
            )
          );
          setIsLoading(false);
          return;
        }

        console.log('[BOOKING] ✅ Negócio encontrado:', {
          id: businessData.id,
          name: businessData.name,
          owner_id: businessData.owner_id,
        });

        setBusiness(businessData as Business);
        const actualBusinessId = businessData.id;

        // Buscar serviços
        console.log('[BOOKING] 📡 Buscando serviços para business_id:', actualBusinessId);
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, name, duration_minutes, price')
          .eq('business_id', actualBusinessId)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (servicesError) {
          console.error('[BOOKING] ❌ Erro ao buscar serviços:', {
            code: servicesError.code,
            message: servicesError.message,
            details: servicesError.details,
          });
          toast.error(
            T(
              "Erro ao carregar serviços. Tente novamente mais tarde.",
              "Error loading services. Please try again later."
            )
          );
        } else {
          console.log('[BOOKING] ✅ Serviços encontrados:', servicesData?.length || 0);
          setServices(servicesData as Service[]);
          // Se houver serviços, pré-seleciona o primeiro para melhor UX
          if (servicesData && servicesData.length > 0 && !selectedService) {
            setSelectedService(servicesData[0] as Service);
          }
        }
      } catch (error: any) {
        console.error('[BOOKING] ❌ Erro inesperado ao carregar dados:', error);
        toast.error(
          T(
            "Ocorreu um erro ao carregar os dados do agendamento. Tente novamente mais tarde.",
            "An error occurred while loading booking data. Please try again later."
          )
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [businessSlug, selectedService]);

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
  
  // Função para buscar o email do proprietário
  const fetchOwnerEmail = useCallback(async (ownerId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', ownerId)
      .single();
      
    if (error) {
      console.error('[BOOKING] Erro ao buscar email do proprietário:', error);
      return null;
    }
    return data?.email || null;
  }, []);


  // Validação de dados básicos
  const validateBookingData = (): boolean => {
    if (!clientDetails.client_name || clientDetails.client_name.trim().length < 3) {
      toast.error(T("Nome completo é obrigatório (mínimo 3 caracteres).", "Full name is required (minimum 3 characters)."));
      return false;
    }

    if (!clientDetails.client_whatsapp) {
      toast.error(T("WhatsApp é obrigatório.", "WhatsApp is required."));
      return false;
    }

    return true;
  };

  // Função de Agendamento (SEM pagamento)
  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error(T("Por favor, selecione o serviço, data e hora.", "Please select service, date and time."));
      return;
    }

    // Validar dados básicos
    if (!validateBookingData()) {
      return;
    }

    if (!business || !templates) return;

    // Verificar limite de agendamentos diários para contas de teste grátis
    try {
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('status, is_trial')
        .eq('user_id', business.owner_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Se for conta de teste grátis, verificar limite de 10 agendamentos diários
      if (subscriptionData?.status === 'trial' || subscriptionData?.is_trial) {
        const today = startOfToday();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Contar agendamentos criados hoje para este negócio
        const { count: appointmentsToday, error: countError } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString());

        if (countError) {
          console.error('[BOOKING] Erro ao contar agendamentos:', countError);
        } else {
          const MAX_DAILY_APPOINTMENTS = 10;
          if ((appointmentsToday || 0) >= MAX_DAILY_APPOINTMENTS) {
            toast.error(
              T(
                "Atingiu o número máximo de agendamento. Só vai retornar depois das 24h.",
                "Reached maximum number of appointments. Will return after 24 hours."
              ),
              { duration: 5000 }
            );
            return;
          }
        }
      }
    } catch (error) {
      console.error('[BOOKING] Erro ao verificar limite de agendamentos:', error);
      // Continuar mesmo se houver erro na verificação
    }

    setIsSubmitting(true);

    // Combina data e hora para criar o timestamp de início
    const [hours, minutes] = selectedTime.split(':').map(Number);
    let startTime = new Date(selectedDate);
    startTime = setHours(startTime, hours);
    startTime = setMinutes(startTime, minutes);
    startTime.setSeconds(0, 0);

    // Calcula o tempo final
    const endTime = addMinutes(startTime, selectedService.duration_minutes);
    
    // Gera o código único do cliente
    const clientCode = generateClientCode();

    const newAppointmentData = {
      business_id: business.id,
      service_id: selectedService.id,
      client_name: clientDetails.client_name,
      client_whatsapp: clientDetails.client_whatsapp,
      client_email: clientDetails.client_email || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'pending',
      client_code: clientCode,
    };

    console.log('[BOOKING] 📝 Criando agendamento com dados:', {
      business_id: business.id,
      business_name: business.name,
      business_owner_id: business.owner_id,
      service_id: selectedService.id,
      service_name: selectedService.name,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      client_code: clientCode,
      client_name: clientDetails.client_name,
      full_data: newAppointmentData,
    });

    // Criar o agendamento
    console.log('[BOOKING] 📤 Enviando requisição para criar agendamento:', {
      table: 'appointments',
      payload: newAppointmentData,
    });

    try {
      const { data: createdAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(newAppointmentData)
        .select('id, business_id, start_time, status')
        .single();

      console.log('[BOOKING] 📥 Resposta da criação:', { 
        success: !appointmentError,
        data: createdAppointment,
        error: appointmentError ? {
          code: appointmentError.code,
          message: appointmentError.message,
          details: appointmentError.details,
          hint: appointmentError.hint,
        } : null,
      });

      if (appointmentError) {
        console.error('[BOOKING] ❌ Erro ao criar agendamento:', {
          code: appointmentError.code,
          message: appointmentError.message,
          details: appointmentError.details,
          hint: appointmentError.hint,
        });
        
        let errorMessage = T("Erro ao criar agendamento.", "Error creating appointment.");
        
        if (appointmentError.code === '23505') {
          errorMessage = T("Erro de código duplicado. Tente novamente.", "Duplicate code error. Please try again.");
        } else if (appointmentError.message) {
          errorMessage = T("Erro ao criar agendamento: ", "Error creating appointment: ") + appointmentError.message;
        }
        
        toast.error(errorMessage);
        setIsSubmitting(false);
        return;
      }

      if (!createdAppointment || !createdAppointment.id) {
        console.error('[BOOKING] ❌ Agendamento criado mas sem ID:', createdAppointment);
        toast.error(
          T(
            "Ocorreu um erro ao criar o agendamento. Tente novamente mais tarde.",
            "An error occurred while creating the appointment. Please try again later."
          )
        );
        setIsSubmitting(false);
        return;
      }

      console.log('[BOOKING] ✅ Agendamento criado com sucesso! ID:', createdAppointment.id);

      toast.success(T("Agendamento realizado com sucesso!", "Appointment successfully scheduled!"));
      
      const formattedDate = format(startTime, 'EEEE, dd/MM/yyyy', { locale: ptBR });
      const formattedTime = format(startTime, 'HH:mm', { locale: ptBR });
      
      // Enviar notificação para o cliente (se tiver e-mail)
      if (clientDetails.client_email) {
        const template = templates.appointment_pending;
        
        let subject = template.subject;
        let body = template.body;
        
        subject = subject.replace(/\{\{service_name\}\}/g, selectedService.name);
        body = body.replace(/\{\{client_name\}\}/g, clientDetails.client_name);
        body = body.replace(/\{\{service_name\}\}/g, selectedService.name);
        body = body.replace(/\{\{date\}\}/g, formattedDate);
        body = body.replace(/\{\{time\}\}/g, formattedTime);
        body = body.replace(/\{\{client_code\}\}/g, clientCode);
        
        sendEmail({
          to: clientDetails.client_email,
          subject: subject,
          body: body,
        });
      }
      
      // Enviar notificação para o dono do negócio
      const ownerEmail = await fetchOwnerEmail(business.owner_id);
      if (ownerEmail) {
          const ownerSubject = `[NOVO AGENDAMENTO] ${business.name}: ${clientDetails.client_name} - ${selectedService.name}`;
          const ownerBody = `
            <h1>Novo Agendamento Pendente</h1>
            <p>Um novo agendamento foi feito para o seu negócio, ${business.name}.</p>
            <ul>
                <li><strong>Cliente:</strong> ${clientDetails.client_name}</li>
                <li><strong>Serviço:</strong> ${selectedService.name}</li>
                <li><strong>Data/Hora:</strong> ${formattedDate} às ${formattedTime}</li>
                <li><strong>WhatsApp:</strong> ${clientDetails.client_whatsapp}</li>
                <li><strong>E-mail:</strong> ${clientDetails.client_email || 'N/A'}</li>
                <li><strong>Código Cliente:</strong> ${clientCode}</li>
            </ul>
            <p><a href="${window.location.origin}/dashboard/agenda">Acessar Agenda</a></p>
          `;
          
          sendEmail({
              to: ownerEmail,
              subject: ownerSubject,
              body: ownerBody,
          });
      }

      // Redirecionar para página de confirmação
      navigate(`/confirmation/${createdAppointment.id}`);
    } catch (error: any) {
      console.error('[BOOKING] ❌ Erro inesperado ao criar agendamento:', error);
      toast.error(
        T(
          "Ocorreu um erro inesperado. Tente novamente mais tarde.",
          "An unexpected error occurred. Please try again later."
        )
      );
      setIsSubmitting(false);
    }
  };

  if (isLoading || isTemplatesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!business) {
    return <div className="text-center p-10">{T('Negócio não encontrado.', 'Business not found.')}</div>;
  }
  
  if (services.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Card className="mb-8 rounded-xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">{business.name}</CardTitle>
              <p className="text-gray-600">{T('Agende seu horário de forma rápida e fácil.', 'Schedule your appointment quickly and easily.')}</p>
            </CardHeader>
          </Card>
          <Card className="p-6 text-center rounded-xl shadow-lg">
            <p className="text-muted-foreground">{T('Desculpe, este negócio não possui serviços ativos para agendamento no momento.', 'Sorry, this business does not have active services for booking at the moment.')}</p>
          </Card>
        </div>
      </div>
    );
  }
  
  // Determine theme color, defaulting to primary blue if null
  const themeColor = business.theme_color || '#2563eb';
  const whatsappLink = business.phone ? getWhatsappLink(business.phone) : null;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Banner Section */}
      {business.cover_photo_url && (
        <div 
          className="h-40 md:h-48 w-full bg-cover bg-center relative"
          style={{ backgroundImage: `url(${business.cover_photo_url})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>
      )}

      <div className="max-w-5xl mx-auto p-4 md:p-8 -mt-8 relative z-10">
        {/* Business Header Card */}
        <Card className="mb-6 shadow-lg border border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
              {business.logo_url && (
                <img 
                  src={business.logo_url} 
                  alt={`${business.name} Logo`} 
                  className="w-20 h-20 rounded-xl object-cover border-2 border-white shadow-md flex-shrink-0"
                />
              )}
              <div className="text-center md:text-left flex-grow">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{business.name}</h1>
                {business.description && (
                  <p className="text-sm text-gray-600 mb-3">
                    {business.description}
                  </p>
                )}
                
                {/* Localização */}
                {business.address && (
                  <a 
                    href={getMapLink(business.address)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-primary transition-colors mb-3"
                  >
                    <MapPin className="h-4 w-4 text-red-500"/> 
                    <span>{business.address}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {/* WhatsApp e Redes Sociais */}
                <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                  {whatsappLink && (
                    <Button 
                      asChild 
                      size="sm"
                      className="bg-[#25D366] hover:bg-[#20BA5A] text-white h-9"
                    >
                      <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                        <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        WhatsApp
                      </a>
                    </Button>
                  )}
                  
                  {/* Redes Sociais */}
                  {business.instagram_url && (
                    <Button 
                      asChild 
                      variant="outline"
                      size="sm"
                      className="h-9"
                    >
                      <a href={business.instagram_url} target="_blank" rel="noopener noreferrer">
                        <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        Instagram
                      </a>
                    </Button>
                  )}
                  
                  {business.facebook_url && (
                    <Button 
                      asChild 
                      variant="outline"
                      size="sm"
                      className="h-9"
                    >
                      <a href={business.facebook_url} target="_blank" rel="noopener noreferrer">
                        <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna de Seleção */}
          <div className="lg:col-span-2 space-y-6">
            
            <ServiceSelector 
              services={services} 
              selectedService={selectedService} 
              onSelectService={(service) => {
                setSelectedService(service);
                setSelectedDate(undefined);
                setSelectedTime(null); 
              }} 
              themeColor={themeColor}
              currentCurrency={currentCurrency}
              T={T}
            />

            {selectedService && business.working_hours && (
              <AppointmentScheduler 
                business={business}
                selectedService={selectedService}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedTime={selectedTime}
                setSelectedTime={setSelectedTime}
                themeColor={themeColor}
                T={T}
              />
            )}

            {selectedService && selectedDate && selectedTime && (
              <ClientDetailsForm 
                clientDetails={clientDetails}
                setClientDetails={setClientDetails}
                T={T}
              />
            )}
          </div>

          {/* Coluna de Resumo */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 shadow-md border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">{T('Resumo', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedService ? (
                  <>
                    <div className="space-y-2 pb-4 border-b">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{selectedService.name}</span>
                        <span className="font-medium">{formatCurrency(selectedService.price, currentCurrency.key, currentCurrency.locale)}</span>
                      </div>
                      <div className="text-xs text-gray-500">{selectedService.duration_minutes} {T('min', 'min')}</div>
                    </div>
                    
                    {selectedDate && selectedTime && (
                      <div className="space-y-2 pb-4 border-b text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">{T('Data', 'Date')}</span>
                          <span>{format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{T('Hora', 'Time')}</span>
                          <span>{selectedTime}</span>
                        </div>
                      </div>
                    )}

                    {clientDetails.client_name && (
                      <div className="pb-4 border-b text-sm">
                        <div className="text-gray-600">{T('Cliente', 'Client')}</div>
                        <div className="font-medium">{clientDetails.client_name}</div>
                      </div>
                    )}


                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-semibold">{T('Total', 'Total')}</span>
                        <span className="text-xl font-bold" style={{ color: themeColor }}>
                          {formatCurrency(selectedService.price, currentCurrency.key, currentCurrency.locale)}
                        </span>
                      </div>
                      
                      <Button 
                        className="w-full h-11" 
                        onClick={handleBooking} 
                        disabled={!selectedService || !selectedDate || !selectedTime || !clientDetails.client_name || !clientDetails.client_whatsapp || isSubmitting}
                        style={{ backgroundColor: themeColor }}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {T('Confirmando...', 'Confirming...')}
                          </>
                        ) : (
                          T('Confirmar Agendamento', 'Confirm Appointment')
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">{T('Selecione um serviço', 'Select a service')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;






