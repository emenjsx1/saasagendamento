import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, Loader2, CheckCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, addMinutes, startOfToday, isSameDay, parseISO, setHours, setMinutes, isBefore, isAfter, isSameMinute } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DaySchedule {
  day: string;
  is_open: boolean;
  start_time: string;
  end_time: string;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface Appointment {
  id: string;
  client_name: string;
  start_time: string;
  services: Service;
}

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
  businessId: string;
  businessWorkingHours: DaySchedule[] | null;
  onSuccess: () => void;
}

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const RescheduleDialog: React.FC<RescheduleDialogProps> = ({
  open,
  onOpenChange,
  appointment,
  businessId,
  businessWorkingHours,
  onSuccess,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isTimesLoading, setIsTimesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when dialog opens/changes appointment
  useEffect(() => {
    if (open) {
      // Initialize date to the current appointment date
      const currentStartTime = parseISO(appointment.start_time);
      setSelectedDate(startOfToday()); // Start with today or current date
      setSelectedTime(null);
    }
  }, [open, appointment]);

  const fetchAvailableTimes = useCallback(async (date: Date) => {
    if (!businessWorkingHours) return;

    setIsTimesLoading(true);
    setAvailableTimes([]);
    setSelectedTime(null);

    const dayIndex = date.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const daySchedule = businessWorkingHours.find(d => d.day === dayNames[dayIndex]);

    if (!daySchedule || !daySchedule.is_open) {
      setIsTimesLoading(false);
      return;
    }

    const [startHour, startMinute] = daySchedule.start_time.split(':').map(Number);
    const [endHour, endMinute] = daySchedule.end_time.split(':').map(Number);
    const duration = appointment.services.duration_minutes;

    let currentTime = setMinutes(setHours(date, startHour), startMinute);
    const endTimeLimit = setMinutes(setHours(date, endHour), endMinute);

    // 1. Buscar agendamentos existentes para o dia (excluindo o agendamento atual)
    const startOfDay = format(date, 'yyyy-MM-dd 00:00:00');
    const endOfDay = format(date, 'yyyy-MM-dd 23:59:59');

    const { data: existingAppointments, error } = await supabase
      .from('appointments')
      .select('id, start_time, end_time')
      .eq('business_id', businessId)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .in('status', ['pending', 'confirmed', 'completed']) // Slots ocupados
      .neq('id', appointment.id); // Excluir o agendamento que está sendo remarcado

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
        if (
          (isAfter(slotStart, occupied.start) && isBefore(slotStart, occupied.end)) ||
          (isAfter(slotEnd, occupied.start) && isBefore(slotEnd, occupied.end)) ||
          (isBefore(slotStart, occupied.start) && isAfter(slotEnd, occupied.end)) ||
          isSameMinute(slotStart, occupied.start)
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
  }, [businessId, businessWorkingHours, appointment.id, appointment.services.duration_minutes]);

  useEffect(() => {
    if (selectedDate && businessWorkingHours) {
      fetchAvailableTimes(selectedDate);
    }
  }, [selectedDate, businessWorkingHours, fetchAvailableTimes]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Por favor, selecione a nova data e hora.");
      return;
    }

    setIsSubmitting(true);

    // Combina data e hora para criar o timestamp de início
    const [hours, minutes] = selectedTime.split(':').map(Number);
    let newStartTime = new Date(selectedDate);
    newStartTime = setHours(newStartTime, hours);
    newStartTime = setMinutes(newStartTime, minutes);
    newStartTime.setSeconds(0, 0);

    // Calcula o tempo final
    const newEndTime = addMinutes(newStartTime, appointment.services.duration_minutes);

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
          status: 'confirmed', // Remarcar geralmente implica confirmar o novo horário
          suggested_time: null, // Limpa qualquer sugestão anterior
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast.success(`Agendamento de ${appointment.client_name} remarcado com sucesso para ${format(newStartTime, 'dd/MM HH:mm')}.`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao remarcar: " + error.message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStartTime = parseISO(appointment.start_time);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Remarcar Agendamento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cliente: <span className="font-semibold">{appointment.client_name}</span> | Serviço: <span className="font-semibold">{appointment.services.name}</span>
          </p>
          <p className="text-xs text-red-500">
            Horário Atual: {format(currentStartTime, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </p>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Coluna de Data */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center"><CalendarIcon className="h-4 w-4 mr-2" /> Selecione a Nova Data</h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              locale={ptBR}
              disabled={(date) => isBefore(date, startOfToday())}
            />
          </div>

          {/* Coluna de Hora */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center"><Clock className="h-4 w-4 mr-2" /> Horários Disponíveis</h3>
            {selectedDate && (
              <div className="h-[300px] overflow-y-auto border rounded-md p-2">
                {isTimesLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : availableTimes.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
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
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">Nenhum horário disponível.</p>
                )}
              </div>
            )}
            {!selectedDate && (
              <p className="text-sm text-muted-foreground py-4">Selecione uma data no calendário.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={handleReschedule} 
            disabled={!selectedDate || !selectedTime || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Remarcação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleDialog;