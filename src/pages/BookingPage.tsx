import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, Clock, User, CheckCircle, MapPin, Phone, MessageSquare, Mail, Briefcase, Lock, CreditCard, ExternalLink, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatCurrency } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, addMinutes, startOfToday, isSameDay, parseISO, setHours, setMinutes, isBefore, isAfter, isSameMinute, startOfMonth, endOfMonth } from 'date-fns';
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
import { replaceEmailTemplate } from '@/utils/email-template-replacer';

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


// Componente de Indicador de Etapas (Step Indicator)
const StepIndicator: React.FC<{
  currentStep: 'service' | 'datetime' | 'details';
  T: (pt: string, en: string) => string;
}> = ({ currentStep, T }) => {
  const steps = [
    { key: 'service', label: T('Serviço', 'Service'), number: 1 },
    { key: 'datetime', label: T('Data & Hora', 'Date & Time'), number: 2 },
    { key: 'details', label: T('Seus Dados', 'Your Details'), number: 3 },
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(s => s.key === currentStep);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between max-w-2xl mx-auto px-2 sm:px-0">
        {steps.map((step, index) => {
          const isActive = step.key === currentStep;
          const isCompleted = index < currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div className="flex items-center w-full">
                  {/* Circle */}
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 font-semibold transition-all duration-200 flex-shrink-0",
                      isCompleted
                        ? "bg-black border-black text-white"
                        : isActive
                        ? "bg-black border-black text-white scale-110"
                        : "bg-white border-gray-300 text-gray-400"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <span className="text-xs sm:text-sm">{step.number}</span>
                    )}
                  </div>
                  {/* Label */}
                  <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                    <p className={cn(
                      "text-sm sm:text-sm font-medium truncate",
                      isActive ? "text-black" : isCompleted ? "text-gray-600" : "text-gray-400"
                    )}>
                      {step.label}
                    </p>
                  </div>
                </div>
              </div>
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-4 h-0.5 hidden sm:block">
                  <div className={cn(
                    "h-full transition-all duration-300",
                    isCompleted ? "bg-black" : "bg-gray-300"
                  )} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// Componente de Seleção de Serviço (Estilo Calendly - Cards clicáveis)
const ServiceSelector: React.FC<{ 
  services: Service[], 
  selectedService: Service | null, 
  onSelectService: (service: Service | null) => void,
  onContinue: () => void,
  themeColor: string,
  currentCurrency: Currency,
  T: (pt: string, en: string) => string,
}> = ({ services, selectedService, onSelectService, onContinue, themeColor, currentCurrency, T }) => {

  return (
    <div className="space-y-4 sm:space-y-6">
                  <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1 sm:mb-2">{T('Selecione o serviço', 'Select service')}</h2>
        <p className="text-gray-600 text-sm sm:text-sm">{T('Escolha o serviço que deseja agendar', 'Choose the service you want to book')}</p>
                  </div>
      
      <div className="grid grid-cols-1 gap-3">
        {services.map((service) => {
          const isSelected = selectedService?.id === service.id;
          return (
            <button
              key={service.id}
              onClick={() => onSelectService(isSelected ? null : service)}
              className={cn(
                "w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all duration-200",
                isSelected
                  ? "border-black bg-black text-white shadow-lg"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1">
                    <h3 className={cn(
                      "text-base sm:text-lg font-semibold truncate",
                      isSelected ? "text-white" : "text-gray-900"
                    )}>
                      {service.name}
                    </h3>
                    {isSelected && (
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white flex-shrink-0" />
                    )}
                </div>
                  <p className={cn(
                    "text-sm sm:text-sm",
                    isSelected ? "text-gray-200" : "text-gray-500"
                  )}>
                    {service.duration_minutes} {T('minutos', 'minutes')}
                  </p>
                </div>
                <div className={cn(
                  "text-base sm:text-lg font-bold flex-shrink-0",
                  isSelected ? "text-white" : "text-gray-900"
                )}>
                  {formatCurrency(service.price, currentCurrency.key, currentCurrency.locale)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Botão Continuar */}
      {selectedService && (
        <div className="flex justify-end pt-3 sm:pt-4">
          <Button
            onClick={onContinue}
            className="bg-black hover:bg-gray-900 text-white font-semibold px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base h-auto"
            size="lg"
          >
            {T('Continuar', 'Continue')}
            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      )}
    </div>
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
  onBack: () => void;
  onContinue: () => void;
  themeColor: string;
  T: (pt: string, en: string) => string;
}> = ({ business, selectedService, selectedDate, setSelectedDate, selectedTime, setSelectedTime, onBack, onContinue, themeColor, T }) => {
  
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
      
      // 2. Verificar se o slot está no futuro (para qualquer dia, não apenas hoje)
      // Se o dia for passado, pular
      if (isBefore(currentTime, now)) {
        currentTime = addMinutes(currentTime, 30); // Avança para o próximo slot de 30 min
        continue;
      }
      
      // Se for o mesmo dia, verificar se o horário já passou
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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1 sm:mb-2">{T('Escolha data e hora', 'Choose date and time')}</h2>
        <p className="text-gray-600 text-sm sm:text-sm">{T('Selecione quando deseja ser atendido', 'Select when you want to be served')}</p>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-4 sm:p-6">
        {/* Seleção de Data */}
        <div className="mb-4 sm:mb-6">
          <label className="text-sm sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3 block">
            {T('Data', 'Date')}
          </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                  "w-full justify-start text-left font-normal h-10 sm:h-12 text-sm sm:text-base border-2",
                  !selectedDate && "text-gray-400 border-gray-300"
                )}
              >
                <CalendarIcon className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" />
                {selectedDate ? (
                  <span className="font-medium text-xs sm:text-base">{format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                ) : (
                  <span className="text-xs sm:text-base">{T('Selecione uma data', 'Select a date')}</span>
                )}
            </Button>
          </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
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
        </div>

        {/* Seleção de Hora */}
        {selectedDate && (
          <div className="space-y-3">
            <label className="text-sm sm:text-sm font-medium text-gray-700 block">
              {T('Horários disponíveis', 'Available times')}
            </label>
            {isTimesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: themeColor }} />
              </div>
            ) : availableTimes.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-3">
                {availableTimes.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    size="lg"
                    className={cn(
                      "h-10 sm:h-12 font-medium text-xs sm:text-base border-2 transition-all",
                      selectedTime === time
                        ? "border-black shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                    style={selectedTime === time ? { backgroundColor: 'black', borderColor: 'black', color: 'white' } : {}}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-sm text-gray-500">{T('Nenhum horário disponível para esta data.', 'No available times for this date.')}</p>
              </div>
            )}
          </div>
        )}

        {/* Botões de Navegação */}
        <div className="flex items-center justify-between pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-gray-200">
          <Button
            onClick={onBack}
            variant="outline"
            className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm h-auto"
          >
            <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            {T('Voltar', 'Back')}
          </Button>
          
          {selectedDate && selectedTime && (
            <Button
              onClick={onContinue}
              className="bg-black hover:bg-gray-900 text-white font-semibold px-6 sm:px-8 py-2 sm:py-3 text-xs sm:text-base h-auto"
            >
              {T('Continuar', 'Continue')}
              <ArrowRight className="ml-2 h-3 w-3 sm:h-5 sm:w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente de Detalhes do Cliente (Estilo Calendly - mais limpo e espaçado)
const ClientDetailsForm: React.FC<{ 
  clientDetails: ClientDetails, 
  setClientDetails: (details: ClientDetails) => void,
  onBack: () => void,
  onSubmit: () => void,
  isSubmitting: boolean,
  T: (pt: string, en: string) => string 
}> = ({ clientDetails, setClientDetails, onBack, onSubmit, isSubmitting, T }) => (
  <div className="space-y-4 sm:space-y-6">
      <div>
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1 sm:mb-2">{T('Informe seus dados', 'Enter your details')}</h2>
      <p className="text-gray-600 text-sm sm:text-sm">{T('Preencha as informações abaixo para finalizar o agendamento', 'Fill in the information below to complete the booking')}</p>
    </div>
    
    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <Label htmlFor="client_name" className="text-sm sm:text-base font-semibold text-gray-900 mb-2 block">
          {T('Nome Completo', 'Full Name')} <span className="text-red-500">*</span>
        </Label>
        <Input 
          id="client_name" 
          value={clientDetails.client_name} 
          onChange={(e) => setClientDetails({ ...clientDetails, client_name: e.target.value })} 
          required 
          className="h-10 sm:h-12 text-sm sm:text-base border-2 border-gray-300 focus:border-black"
          placeholder={T('Digite seu nome completo', 'Enter your full name')}
        />
      </div>
      
      <div>
        <Label htmlFor="client_whatsapp" className="text-sm sm:text-base font-semibold text-gray-900 mb-2 block">
          WhatsApp <span className="text-red-500">*</span>
        </Label>
        <Input 
          id="client_whatsapp" 
          value={clientDetails.client_whatsapp} 
          onChange={(e) => setClientDetails({ ...clientDetails, client_whatsapp: e.target.value })} 
          placeholder="841234567"
          required 
          className="h-10 sm:h-12 text-sm sm:text-base border-2 border-gray-300 focus:border-black"
        />
        <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">{T('Digite apenas números (9 dígitos)', 'Enter numbers only (9 digits)')}</p>
      </div>
      
      <div>
        <Label htmlFor="client_email" className="text-sm sm:text-base font-semibold text-gray-900 mb-2 block">
          {T('E-mail', 'Email')} <span className="text-gray-400 text-xs sm:text-sm font-normal">({T('Opcional', 'Optional')})</span>
        </Label>
        <Input 
          id="client_email" 
          type="email"
          value={clientDetails.client_email} 
          onChange={(e) => setClientDetails({ ...clientDetails, client_email: e.target.value })} 
          className="h-10 sm:h-12 text-sm sm:text-base border-2 border-gray-300 focus:border-black"
          placeholder="seu@email.com"
        />
        <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">{T('Recomendado para receber confirmações por e-mail', 'Recommended to receive email confirmations')}</p>
      </div>

      {/* Botões de Navegação */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-gray-200">
        <Button
          onClick={onBack}
          variant="outline"
          className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm h-auto w-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          {T('Voltar', 'Back')}
        </Button>
        
        <Button
          onClick={onSubmit}
          disabled={!clientDetails.client_name || !clientDetails.client_whatsapp || isSubmitting}
          className="bg-black hover:bg-gray-900 text-white font-semibold px-6 sm:px-8 py-2 sm:py-3 text-xs sm:text-base h-auto disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              {T('Confirmando...', 'Confirming...')}
            </>
          ) : (
            <>
              {T('Confirmar Agendamento', 'Confirm Appointment')}
              <CheckCircle className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  </div>
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
  const [currentStep, setCurrentStep] = useState<'service' | 'datetime' | 'details'>('service');
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

    // Verificar limite de agendamentos mensais para plano Free (30/mês)
    try {
      if (business?.owner_id) {
        // Buscar plano do dono do negócio
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
          .select('plan_name, status, is_trial')
        .eq('user_id', business.owner_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

        const { data: paymentData } = await supabase
          .from('payments')
          .select('plan_name, status')
          .eq('user_id', business.owner_id)
          .eq('status', 'paid')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Determinar plano ativo
        let currentPlan: string | null = null;
        if (paymentData?.plan_name) {
          currentPlan = paymentData.plan_name.toLowerCase();
        } else if (subscriptionData?.plan_name) {
          currentPlan = subscriptionData.plan_name.toLowerCase();
        } else if (subscriptionData?.status === 'trial' || subscriptionData?.is_trial) {
          currentPlan = 'free'; // Trial = Free
        }

        // Se for plano Free, verificar limite mensal de 30 agendamentos
        if (currentPlan && (currentPlan.includes('free') || currentPlan.includes('teste') || currentPlan.includes('trial'))) {
          const now = new Date();
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);

          // Contar agendamentos do mês atual para este negócio
          const { count: appointmentsThisMonth, error: countError } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id)
            .gte('start_time', monthStart.toISOString())
            .lte('start_time', monthEnd.toISOString())
            .neq('status', 'cancelled');

        if (countError) {
          console.error('[BOOKING] Erro ao contar agendamentos:', countError);
        } else {
            const MAX_MONTHLY_APPOINTMENTS = 30;
            if ((appointmentsThisMonth || 0) >= MAX_MONTHLY_APPOINTMENTS) {
            toast.error(
              T(
                  "Este negócio atingiu o limite de 30 agendamentos por mês. Tente novamente no próximo mês ou entre em contato com o estabelecimento.",
                  "This business has reached the 30 appointments per month limit. Try again next month or contact the establishment."
              ),
                { duration: 7000 }
            );
            return;
            }
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

      // Enviar dados para o webhook
      try {
        const webhookPayload = {
          appointment_id: createdAppointment.id,
          business_id: business.id,
          business_name: business.name,
          business_phone: business.phone || null,
          business_whatsapp: business.phone || null, // Usando phone como WhatsApp
          service_id: selectedService.id,
          service_name: selectedService.name,
          service_duration: selectedService.duration_minutes,
          service_price: selectedService.price,
          client_name: clientDetails.client_name,
          client_whatsapp: clientDetails.client_whatsapp,
          client_email: clientDetails.client_email || null,
          client_code: clientCode,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          formatted_date: format(startTime, 'dd/MM/yyyy', { locale: ptBR }),
          formatted_time: format(startTime, 'HH:mm', { locale: ptBR }),
          status: 'pending',
          created_at: new Date().toISOString(),
        };

        console.log('[BOOKING] 📤 Enviando dados para webhook:', webhookPayload);

        const webhookResponse = await fetch('https://srv-4544.cloudnuvem.net/webhook/agencodes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (webhookResponse.ok) {
          console.log('[BOOKING] ✅ Webhook enviado com sucesso!');
        } else {
          console.warn('[BOOKING] ⚠️ Webhook retornou status não-OK:', webhookResponse.status, webhookResponse.statusText);
        }
      } catch (webhookError: any) {
        // Não bloquear o fluxo se o webhook falhar
        console.error('[BOOKING] ⚠️ Erro ao enviar webhook (não crítico):', webhookError);
      }

      toast.success(T("Agendamento realizado com sucesso!", "Appointment successfully scheduled!"));
      
      const formattedDate = format(startTime, 'EEEE, dd/MM/yyyy', { locale: ptBR });
      const formattedTime = format(startTime, 'HH:mm', { locale: ptBR });
      
      // Enviar notificação para o cliente (se tiver e-mail)
      if (clientDetails.client_email) {
        const template = templates.appointment_pending;
        
        const appointmentData = {
          client_name: clientDetails.client_name,
          client_code: clientCode,
          service_name: selectedService.name,
          service_duration: selectedService.duration_minutes,
          service_price: selectedService.price,
          formatted_date: format(startTime, 'dd/MM/yyyy', { locale: ptBR }),
          formatted_time: formattedTime,
          appointment_status: 'pending' as const,
          appointment_id: createdAppointment.id,
          appointment_link: `${window.location.origin}/confirmation/${createdAppointment.id}`,
        };

        const businessData = {
          logo_url: business.logo_url,
          theme_color: business.theme_color,
          name: business.name,
          phone: business.phone,
          address: business.address,
        };

        let subject = replaceEmailTemplate(template.subject, businessData, appointmentData, currentCurrency);
        let body = replaceEmailTemplate(template.body, businessData, appointmentData, currentCurrency);
        
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

        {/* Indicador de Etapas */}
        <StepIndicator currentStep={currentStep} T={T} />
            
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna de Seleção - Sistema de Etapas */}
          <div className="lg:col-span-2">
            {/* Etapa 1: Seleção de Serviço */}
            {currentStep === 'service' && (
            <ServiceSelector 
              services={services} 
              selectedService={selectedService} 
              onSelectService={(service) => {
                setSelectedService(service);
                setSelectedDate(undefined);
                setSelectedTime(null); 
                  // Reset para etapa 1 se deselecionar
                  if (!service) {
                    setCurrentStep('service');
                  }
                }} 
                onContinue={() => {
                  if (selectedService) {
                    setCurrentStep('datetime');
                  }
              }} 
              themeColor={themeColor}
              currentCurrency={currentCurrency}
              T={T}
            />
            )}

            {/* Etapa 2: Data e Hora */}
            {currentStep === 'datetime' && selectedService && business.working_hours && (
              <AppointmentScheduler 
                business={business}
                selectedService={selectedService}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedTime={selectedTime}
                setSelectedTime={setSelectedTime}
                onBack={() => setCurrentStep('service')}
                onContinue={() => {
                  if (selectedDate && selectedTime) {
                    setCurrentStep('details');
                  }
                }}
                themeColor={themeColor}
                T={T}
              />
            )}

            {/* Etapa 3: Dados do Cliente */}
            {currentStep === 'details' && selectedService && selectedDate && selectedTime && (
              <ClientDetailsForm 
                clientDetails={clientDetails}
                setClientDetails={setClientDetails}
                onBack={() => setCurrentStep('datetime')}
                onSubmit={handleBooking}
                isSubmitting={isSubmitting}
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
        
        {/* Footer AGENCODES */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-1">
              FEITO POR AgenCode
            </p>
            <p className="text-xs text-gray-400">
              {T('Plataforma de agendamentos inteligente', 'Smart booking platform')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;

