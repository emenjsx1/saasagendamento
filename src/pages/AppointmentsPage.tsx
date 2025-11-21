import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, MoreHorizontal, CheckCircle, XCircle, Filter, Calendar as CalendarIcon, RotateCcw, Clock, User, Briefcase, Tag, Repeat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { format, startOfDay, parseISO, isToday, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateFilter } from '@/components/DateFilter';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn, formatCurrency } from '@/lib/utils';
import RescheduleDialog from '@/components/RescheduleDialog';
import { useBusinessSchedule } from '@/hooks/use-business-schedule';
import { useEmailNotifications } from '@/hooks/use-email-notifications'; 
import { useEmailTemplates } from '@/hooks/use-email-templates';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBusiness } from '@/hooks/use-business'; // Importar useBusiness para pegar theme_color
import { replaceEmailTemplate } from '@/utils/email-template-replacer';

type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface Appointment {
  id: string;
  client_name: string;
  client_whatsapp: string;
  client_email: string | null; // Adicionado email
  client_code: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  services: Service;
}

const statusMap: Record<AppointmentStatus, { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
  completed: { label: 'Concluído', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
};

const AppointmentsPage: React.FC = () => {
  const { user } = useSession();
  const { business, isLoading: isBusinessDataLoading, businessId: businessIdFromHook } = useBusiness(); // Pega dados do negócio
  const { businessSchedule, businessId: businessIdFromSchedule, isLoading: isScheduleLoading } = useBusinessSchedule();
  const { sendEmail } = useEmailNotifications(); 
  const { templates, isLoading: isTemplatesLoading } = useEmailTemplates();
  const { currentCurrency, T } = useCurrency();
  
  // Usar business.id se disponível, senão usar businessId do hook
  const businessId = business?.id || businessIdFromHook || businessIdFromSchedule;
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]); // Para o resumo rápido
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('pending');
  const [filterDate, setFilterDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  const themeColor = business?.theme_color || '#2563eb'; // Cor do tema
  
  // Log para debug
  useEffect(() => {
    console.log('🔍 AppointmentsPage - businessId atualizado:', {
      businessId,
      businessIdFromHook,
      businessIdFromSchedule,
      businessIdFromBusiness: business?.id,
      businessName: business?.name,
    });
  }, [businessId, businessIdFromHook, businessIdFromSchedule, business]);

  const fetchAppointments = useCallback(async () => {
    if (!user || !filterDate || !businessId) {
      console.log('⚠️ fetchAppointments: Condições não atendidas', { 
        user: !!user, 
        filterDate: !!filterDate, 
        businessId: !!businessId,
        businessIdValue: businessId,
      });
      return;
    }

    console.log('🔍 fetchAppointments: Iniciando busca', { 
      filterStatus, 
      filterDate: filterDate.toISOString(), 
      businessId, 
      refreshKey,
      userId: user.id,
    });
    setIsLoadingAppointments(true);

    // Construir Query de Agendamentos
    const startOfDayString = format(filterDate, 'yyyy-MM-dd 00:00:00');
    const endOfDayString = format(filterDate, 'yyyy-MM-dd 23:59:59');

    console.log('📅 Período de busca:', { startOfDayString, endOfDayString });

    // Buscar TODOS os appointments do dia (sem filtro de status) para o resumo rápido
    console.log('🔍 Buscando TODOS os appointments para resumo rápido...');
    const { data: allAppointmentsData, error: allAppointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        business_id,
        client_name,
        client_whatsapp,
        client_email,
        client_code,
        start_time,
        end_time,
        status,
        services (id, name, duration_minutes, price)
      `)
      .eq('business_id', businessId)
      .gte('start_time', startOfDayString)
      .lte('start_time', endOfDayString)
      .order('start_time', { ascending: true });

    console.log('📊 Resultado busca todos:', {
      count: allAppointmentsData?.length || 0,
      error: allAppointmentsError,
      data: allAppointmentsData?.map(a => ({ id: a.id, business_id: a.business_id, start_time: a.start_time, status: a.status })),
    });

    if (allAppointmentsError) {
      console.error('❌ Erro ao buscar todos os appointments:', allAppointmentsError);
    }

    if (!allAppointmentsError && allAppointmentsData) {
      const mappedAllAppointments = (allAppointmentsData || []).map(app => ({
        ...app,
        services: Array.isArray(app.services) ? app.services[0] : app.services,
      })) as Appointment[];
      console.log('✅ Appointments mapeados para resumo:', mappedAllAppointments.length);
      setAllAppointments(mappedAllAppointments);
    } else {
      console.log('⚠️ Nenhum appointment encontrado para resumo');
      setAllAppointments([]);
    }

    // Buscar appointments filtrados para a lista principal
    let query = supabase
      .from('appointments')
      .select(`
        id,
        client_name,
        client_whatsapp,
        client_email,
        client_code,
        start_time,
        end_time,
        status,
        services (id, name, duration_minutes, price)
      `)
      .eq('business_id', businessId)
      .gte('start_time', startOfDayString)
      .lte('start_time', endOfDayString);

    // Aplicar filtro de Status
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
      console.log('Aplicando filtro de status:', filterStatus);
    }
    
    // Ordenar por data de início
    query = query.order('start_time', { ascending: true });

    const { data: appointmentsData, error: appointmentsError } = await query;

    if (appointmentsError) {
      console.error('❌ Erro ao buscar agendamentos filtrados:', {
        error: appointmentsError,
        code: appointmentsError.code,
        message: appointmentsError.message,
        details: appointmentsError.details,
        hint: appointmentsError.hint,
      });
      toast.error(T("Erro ao carregar agendamentos.", "Error loading appointments."));
      setAppointments([]);
    } else {
      console.log('✅ Agendamentos encontrados (filtrados):', appointmentsData?.length || 0, 'com status:', filterStatus);
      console.log('📋 Dados brutos:', appointmentsData?.map(a => ({ 
        id: a.id, 
        business_id: a.business_id, 
        start_time: a.start_time, 
        status: a.status,
        client_name: a.client_name,
      })));
      
      // Mapear os dados para garantir que o objeto services esteja no formato correto
      const mappedAppointments = (appointmentsData || []).map(app => ({
          ...app,
          services: Array.isArray(app.services) ? app.services[0] : app.services,
      })) as Appointment[];
      
      console.log('✅ Agendamentos mapeados:', mappedAppointments.length);
      setAppointments(mappedAppointments);
    }
    setIsLoadingAppointments(false);
  }, [user, filterStatus, filterDate, businessId, refreshKey, T]);

  useEffect(() => {
    console.log('useEffect: fetchAppointments será chamado', { businessId, filterStatus, refreshKey });
    if (businessId && user && filterDate) {
      fetchAppointments();
    }
  }, [businessId, user, filterDate, filterStatus, refreshKey, fetchAppointments]);

  const handleRescheduleClick = (app: Appointment) => {
    setSelectedAppointment(app);
    setIsRescheduleModalOpen(true);
  };

  const handleRescheduleSuccess = () => {
    // Força a atualização da lista
    setRefreshKey(prev => prev + 1); 
  };

  const updateAppointmentStatus = async (app: Appointment, newStatus: AppointmentStatus) => {
      const loadingToastId = toast.loading(T(`Atualizando status para ${statusMap[newStatus].label}...`, `Updating status to ${statusMap[newStatus].label}...`));
    
    try {
      console.log('Atualizando status do agendamento:', { id: app.id, statusAtual: app.status, novoStatus: newStatus });
      
      // Atualizar no banco de dados (sem exigir retorno de linha para evitar erro PGRST116)
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', app.id);

      if (error) {
        console.error('Erro ao atualizar status no banco:', error);
        throw error;
      }

      console.log('Status atualizado no banco com sucesso');

      // Atualizar estado local imediatamente
      if (filterStatus !== 'all' && filterStatus !== newStatus) {
        // Se o novo status não corresponde ao filtro, remover da lista
        setAppointments(prevAppointments => {
          const filtered = prevAppointments.filter(apt => apt.id !== app.id);
          console.log('Agendamento removido da lista (não corresponde ao filtro). Total restante:', filtered.length);
          return filtered;
        });
      } else {
        // Se o agendamento ainda deve aparecer, atualizar o status localmente
        setAppointments(prevAppointments => 
          prevAppointments.map(apt => 
            apt.id === app.id ? { ...apt, status: newStatus } : apt
          )
        );
        console.log('Status atualizado localmente para:', newStatus);
      }

      // Enviar Notificação por E-mail (se o cliente tiver e-mail)
      if (app.client_email && templates) {
        try {
          const startTime = parseISO(app.start_time);
          const formattedDate = format(startTime, 'EEEE, dd/MM/yyyy', { locale: ptBR });
          const formattedTime = format(startTime, 'HH:mm', { locale: ptBR });
          
          let templateKey: keyof typeof templates | null = null;
          
          if (newStatus === 'confirmed') {
              templateKey = 'appointment_confirmed';
          } else if (newStatus === 'rejected' || newStatus === 'cancelled') {
              templateKey = 'appointment_pending'; 
          } else if (newStatus === 'completed') {
              templateKey = null; 
          }

          if (templateKey) {
              const template = templates[templateKey];
              
              try {
                // Buscar dados do negócio
                const { data: businessData } = await supabase
                  .from('businesses')
                  .select('logo_url, theme_color, name, phone, address')
                  .eq('id', app.business_id)
                  .single();

                const appointmentData = {
                  client_name: app.client_name,
                  client_code: app.client_code,
                  service_name: app.services.name,
                  service_duration: app.services.duration_minutes,
                  service_price: app.services.price,
                  formatted_date: format(startTime, 'dd/MM/yyyy', { locale: ptBR }),
                  formatted_time: formattedTime,
                  appointment_status: (newStatus === 'confirmed' ? 'confirmed' : newStatus === 'cancelled' ? 'cancelled' : 'pending') as 'pending' | 'confirmed' | 'cancelled',
                  appointment_id: app.id,
                  appointment_link: `${window.location.origin}/confirmation/${app.id}`,
                };

                const businessInfo = {
                  logo_url: businessData?.logo_url || business?.logo_url || null,
                  theme_color: businessData?.theme_color || business?.theme_color || themeColor || '#2563eb',
                  name: businessData?.name || business?.name || 'Negócio',
                  phone: businessData?.phone || business?.phone || null,
                  address: businessData?.address || business?.address || null,
                };

                let subject = replaceEmailTemplate(template.subject, businessInfo, appointmentData, currentCurrency);
                let body = replaceEmailTemplate(template.body, businessInfo, appointmentData, currentCurrency);

                sendEmail({
                  to: app.client_email,
                  subject: subject,
                  body: body,
                });
              } catch (templateError) {
                // Fallback para substituição usando replaceEmailTemplate
                console.error('Erro ao usar template com branding, usando fallback:', templateError);
                
                // Tentar novamente com replaceEmailTemplate mesmo no fallback
                try {
                  const appointmentData = {
                    client_name: app.client_name,
                    client_code: app.client_code,
                    service_name: app.services.name,
                    service_duration: app.services.duration_minutes,
                    service_price: app.services.price,
                    formatted_date: format(startTime, 'dd/MM/yyyy', { locale: ptBR }),
                    formatted_time: formattedTime,
                    appointment_status: (newStatus === 'confirmed' ? 'confirmed' : newStatus === 'cancelled' ? 'cancelled' : 'pending') as 'pending' | 'confirmed' | 'cancelled',
                    appointment_id: app.id,
                    appointment_link: `${window.location.origin}/confirmation/${app.id}`,
                  };

                  const businessInfo = {
                    logo_url: businessData?.logo_url || business?.logo_url || null,
                    theme_color: businessData?.theme_color || business?.theme_color || themeColor || '#2563eb',
                    name: businessData?.name || business?.name || 'Negócio',
                    phone: businessData?.phone || business?.phone || null,
                    address: businessData?.address || business?.address || null,
                  };

                  let subject = replaceEmailTemplate(template.subject, businessInfo, appointmentData, currentCurrency);
                  let body = replaceEmailTemplate(template.body, businessInfo, appointmentData, currentCurrency);
                  
                  if (newStatus === 'rejected') {
                    subject = subject.replace('Pendente', 'REJEITADO').replace('pendente', 'REJEITADO');
                    body = body.replace('PENDENTE', 'REJEITADO').replace('Pendente', 'REJEITADO');
                  } else if (newStatus === 'cancelled') {
                    subject = subject.replace('Pendente', 'CANCELADO').replace('pendente', 'CANCELADO');
                    body = body.replace('PENDENTE', 'CANCELADO').replace('Pendente', 'CANCELADO');
                  }

                  sendEmail({
                    to: app.client_email,
                    subject: subject,
                    body: body,
                  });
                } catch (fallbackError) {
                  console.error('Erro no fallback também:', fallbackError);
                  // Se até o fallback falhar, não enviar email mas não quebrar o fluxo
                }
              }
          }
        } catch (emailError) {
          console.error('Erro ao enviar email (não crítico):', emailError);
        }
      }

      // Força a recarga completa da lista do banco de dados
      setRefreshKey(prev => {
        const newKey = prev + 1;
        console.log('RefreshKey incrementado para forçar recarga:', newKey);
        return newKey;
      });
      
      toast.success(T(`Agendamento atualizado para ${statusMap[newStatus].label}.`, `Appointment updated to ${statusMap[newStatus].label}.`), { id: loadingToastId });
      
    } catch (error: any) {
      console.error('Erro completo ao atualizar status:', error);
      toast.error(T(`Erro ao atualizar status: ${error.message || 'Erro desconhecido'}`, `Error updating status: ${error.message || 'Unknown error'}`), { id: loadingToastId });
    }
  };

  // Geração de todas as horas do dia (00:00 a 23:00) e mapeamento dos agendamentos
  const hourlySchedule = useMemo(() => {
    const schedule = [];
    const appointmentsByHour = new Map<string, Appointment[]>();

    // 1. Mapear agendamentos existentes por hora de início
    appointments.forEach(app => {
      const startTime = parseISO(app.start_time);
      const hourKey = format(startTime, 'HH:00');
      
      if (!appointmentsByHour.has(hourKey)) {
        appointmentsByHour.set(hourKey, []);
      }
      appointmentsByHour.get(hourKey)?.push(app);
    });

    // 2. Gerar TODAS as 24 horas do dia (00:00 a 23:00)
    // Mostrar todos os horários, mesmo os vazios
    for (let h = 0; h < 24; h++) {
      const hourDate = setMinutes(setHours(new Date(), h), 0);
      const hourKey = format(hourDate, 'HH:00');
      
      schedule.push({
        hour: hourKey,
        appointments: appointmentsByHour.get(hourKey) || [],
        isEmpty: !appointmentsByHour.has(hourKey), // Marcar se está vazio
      });
    }

    // 3. Retornar TODAS as horas (não filtrar)
    return schedule;
  }, [appointments, filterDate]);

  if (isScheduleLoading || isLoadingAppointments || isTemplatesLoading || isBusinessDataLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!businessId) {
    return (
      <Card className="p-6 text-center rounded-3xl border border-gray-200 shadow-xl">
        <CardTitle className="text-xl mb-4">{T('Negócio Não Cadastrado', 'Business Not Registered')}</CardTitle>
        <p className="mb-4">{T('Você precisa cadastrar as informações do seu negócio antes de gerenciar agendamentos.', 'You need to register your business information before managing appointments.')}</p>
        <Button asChild className="rounded-2xl bg-black text-white">
          <a href="/register-business">{T('Cadastrar Meu Negócio', 'Register My Business')}</a>
        </Button>
      </Card>
    );
  }

  const formattedDate = filterDate ? format(filterDate, 'EEEE, dd \'de\' MMMM', { locale: ptBR }) : T('Selecione uma Data', 'Select a Date');

  return (
    <div className="space-y-10 pb-16">
      <section className="rounded-3xl bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white p-6 md:p-10 shadow-2xl flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{T('Agenda inteligente', 'Smart Schedule')}</p>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-2">{T('Visão diária', 'Daily View')}</h1>
            <p className="text-gray-300 mt-3 text-sm md:text-base max-w-2xl">
              {T('Centralize todos os agendamentos do dia, confirme clientes em um clique e mantenha sua operação fluindo sem atritos.', 'Centralize all day appointments, confirm clients with one click and keep your operation flowing smoothly.')}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="rounded-2xl border border-white/20 px-4 py-2 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{T('Data', 'Date')}</p>
              <p className="text-lg font-semibold mt-1">{formattedDate}</p>
            </div>
            <Button
              variant="outline"
              className="border-gray-300 bg-white text-gray-900 hover:bg-gray-100 rounded-2xl font-semibold"
              onClick={() => setFilterDate(startOfDay(new Date()))}
            >
              {T('Voltar para hoje', 'Back to Today')}
              <RotateCcw className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-2xl border border-white/15 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{T('Confirmados', 'Confirmed')}</p>
            <p className="text-3xl font-bold mt-2">{appointments.filter(app => app.status === 'confirmed').length}</p>
            <p className="text-gray-400 text-sm mt-1">{T('Clientes aguardando atendimento hoje', 'Clients waiting for service today')}</p>
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/15 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{T('Pendentes', 'Pending')}</p>
            <p className="text-3xl font-bold mt-2">{appointments.filter(app => app.status === 'pending').length}</p>
            <p className="text-gray-400 text-sm mt-1">{T('Agendamentos aguardando ação', 'Appointments awaiting action')}</p>
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/15 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{T('Receita estimada', 'Estimated Revenue')}</p>
            <p className="text-3xl font-bold mt-2">
              {formatCurrency(
                appointments.reduce((sum, app) => sum + (app.services?.price || 0), 0),
                currentCurrency.key,
                currentCurrency.locale
              )}
            </p>
            <p className="text-gray-400 text-sm mt-1">{T('Total considerando todos os horários do dia', 'Total considering all day times')}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 rounded-3xl border border-black/5 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-semibold">{T('Fluxo diário', 'Daily Flow')}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">{T('Configure a data e o status para focar no que importa agora.', 'Set date and status to focus on what matters now.')}</p>
              </div>
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <DateFilter date={filterDate} setDate={setFilterDate} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <ToggleGroup
                    type="single"
                    value={filterStatus}
                    onValueChange={(value: AppointmentStatus | 'all') => value && setFilterStatus(value)}
                    className="flex gap-1"
                  >
                    {[
                      { label: T('Pendente', 'Pending'), value: 'pending' },
                      { label: T('Confirmado', 'Confirmed'), value: 'confirmed' },
                      { label: T('Concluído', 'Completed'), value: 'completed' },
                      { label: T('Todos', 'All'), value: 'all' },
                    ].map((item) => (
                      <ToggleGroupItem
                        key={item.value}
                        value={item.value as AppointmentStatus | 'all'}
                        className="rounded-xl px-3 py-1 text-xs font-semibold data-[state=on]:bg-black data-[state=on]:text-white"
                      >
                        {item.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {hourlySchedule.map(({ hour, appointments: hourlyApps, isEmpty }) => (
                <div key={hour} className={`flex flex-col md:flex-row ${isEmpty ? 'bg-gray-50/50' : ''}`}>
                  <div className="md:w-24 flex-shrink-0 px-4 py-4 bg-gray-50 border-b md:border-r flex items-center justify-center">
                    <span className="text-xl font-semibold text-gray-700">{hour}</span>
                  </div>
                  <div className="flex-1 px-4 py-4 space-y-4 border-b min-h-[60px]">
                    {hourlyApps.length > 0 ? (
                      hourlyApps.map((app) => {
                        const startTime = parseISO(app.start_time);
                        const endTime = parseISO(app.end_time);
                        const statusInfo = statusMap[app.status] || statusMap.pending;

                        return (
                          <div
                            key={app.id}
                            className={cn(
                              'p-4 rounded-2xl border transition-all bg-white/70 backdrop-blur hover:shadow-lg flex flex-col gap-3',
                              app.status === 'confirmed' && 'border-black',
                              app.status === 'completed' && 'border-emerald-500',
                              app.status === 'pending' && 'border-yellow-500/60',
                              app.status === 'rejected' && 'border-red-500/60',
                              app.status === 'cancelled' && 'border-gray-400/60'
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-2 justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={statusInfo.variant as any} className="rounded-full px-3">
                                  {statusInfo.label}
                                </Badge>
                                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                  <Tag className="h-4 w-4" /> {app.client_code}
                                </span>
                              </div>
                              <div className="text-sm font-semibold text-gray-500 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="space-y-1">
                                <p className="text-lg font-semibold flex items-center gap-2">
                                  <User className="h-4 w-4 text-black" />
                                  {app.client_name}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                  <Briefcase className="h-4 w-4" />
                                  {app.services.name} ({app.services.duration_minutes} min)
                                </p>
                                <p className="text-base font-bold text-emerald-600">
                                  {formatCurrency(app.services.price, currentCurrency.key, currentCurrency.locale)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full border-gray-200"
                                  onClick={() => handleRescheduleClick(app)}
                                >
                                  <Repeat className="h-4 w-4 mr-2" />
                                  {T('Remarcar', 'Reschedule')}
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="secondary" className="rounded-full">
                                      {T('Ações', 'Actions')}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-2xl">
                                    <DropdownMenuLabel>{T('Gerenciar Agendamento', 'Manage Appointment')}</DropdownMenuLabel>
                                    {app.status !== 'confirmed' && (
                                      <DropdownMenuItem onClick={() => updateAppointmentStatus(app, 'confirmed')}>
                                        <CheckCircle className="h-4 w-4 mr-2" /> {T('Confirmar', 'Confirm')}
                                      </DropdownMenuItem>
                                    )}
                                    {app.status !== 'completed' && (
                                      <DropdownMenuItem onClick={() => updateAppointmentStatus(app, 'completed')}>
                                        {T('Registrar Conclusão', 'Register Completion')}
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    {app.status !== 'rejected' && (
                                      <DropdownMenuItem onClick={() => updateAppointmentStatus(app, 'rejected')}>
                                        <XCircle className="h-4 w-4 mr-2" /> {T('Rejeitar', 'Reject')}
                                      </DropdownMenuItem>
                                    )}
                                    {app.status !== 'cancelled' && (
                                      <DropdownMenuItem onClick={() => updateAppointmentStatus(app, 'cancelled')}>
                                        {T('Cancelar', 'Cancel')}
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-gray-200 p-4 bg-gray-50 text-sm text-gray-500">
                        {T('Livre para agendamento.', 'Available for booking.')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{T('Resumo rápido', 'Quick Summary')}</CardTitle>
              <p className="text-sm text-gray-500">{T('Monitoramento instantâneo dos fluxos principais.', 'Instant monitoring of main flows.')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: T('Confirmar próximos clientes', 'Confirm next clients'),
                  value: `${allAppointments.filter(app => app.status === 'pending').length} ${T('pendentes', 'pending')}`,
                  action: T('Ver lista', 'View list'),
                  onClick: () => setFilterStatus('pending'),
                },
                {
                  label: T('Atendimentos já concluídos', 'Completed services'),
                  value: `${allAppointments.filter(app => app.status === 'completed').length} ${T('concluídos', 'completed')}`,
                  action: T('Detalhar', 'Details'),
                  onClick: () => setFilterStatus('completed'),
                },
                {
                  label: T('Clientes aguardando resposta', 'Clients awaiting response'),
                  value: `${allAppointments.filter(app => ['rejected', 'cancelled'].includes(app.status)).length} ${T('precisam atenção', 'need attention')}`,
                  action: T('Resolver', 'Resolve'),
                  onClick: () => setFilterStatus('all'),
                },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-gray-200 p-4 bg-white flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{item.label}</p>
                    <p className="text-lg font-semibold text-gray-900">{item.value}</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={item.onClick}>
                    {item.action}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{T('Próximas melhorias', 'Next Improvements')}</CardTitle>
              <p className="text-sm text-gray-500">{T('Use essas ações rápidas para manter sua operação impecável.', 'Use these quick actions to keep your operation flawless.')}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                T('Confirme todos os agendamentos do dia antes das 10h', 'Confirm all day appointments before 10am'),
                T('Envie lembretes automáticos para reduzir faltas', 'Send automatic reminders to reduce no-shows'),
                T('Personalize a mensagem de confirmação para fidelizar clientes', 'Customize confirmation message to retain clients'),
              ].map((text) => (
                <div key={text} className="text-sm text-gray-600 flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-black flex-shrink-0" />
                  {text}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
      
      {/* Modal de Remarcação */}
      {selectedAppointment && businessSchedule && (
        <RescheduleDialog
          open={isRescheduleModalOpen}
          onOpenChange={setIsRescheduleModalOpen}
          appointment={selectedAppointment}
          businessId={businessId!}
          businessWorkingHours={businessSchedule.working_hours}
          onSuccess={handleRescheduleSuccess}
        />
      )}
    </div>
  );
};

export default AppointmentsPage;