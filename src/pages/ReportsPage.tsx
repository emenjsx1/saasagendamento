import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart3, 
  Loader2, 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  XCircle, 
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useBusiness } from '@/hooks/use-business';
import { useReportsData } from '@/hooks/use-reports-data';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/utils';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RevenueLineChart } from '@/components/reports/RevenueLineChart';
import { AppointmentsStatusDonut } from '@/components/reports/AppointmentsStatusDonut';
import { ServicesBarChart } from '@/components/reports/ServicesBarChart';
import { AppointmentsByDayChart } from '@/components/reports/AppointmentsByDayChart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type DateRangePreset = 'today' | 'yesterday' | '7days' | '30days' | '90days' | 'thisYear' | 'custom';

const ReportsPage: React.FC = () => {
  const { businessId, isLoading: isBusinessLoading, business } = useBusiness();
  const { currentCurrency, T } = useCurrency();
  
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('30days');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('summary');

  const { summary, appointments, clients, revenue, services, isLoading } = useReportsData(
    businessId,
    startDate,
    endDate
  );

  // Atualizar datas quando o preset mudar
  React.useEffect(() => {
    const today = new Date();
    switch (dateRangePreset) {
      case 'today':
        setStartDate(startOfDay(today));
        setEndDate(endOfDay(today));
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setStartDate(startOfDay(yesterday));
        setEndDate(endOfDay(yesterday));
        break;
      case '7days':
        setStartDate(subDays(today, 7));
        setEndDate(today);
        break;
      case '30days':
        setStartDate(subDays(today, 30));
        setEndDate(today);
        break;
      case '90days':
        setStartDate(subDays(today, 90));
        setEndDate(today);
        break;
      case 'thisYear':
        setStartDate(startOfYear(today));
        setEndDate(endOfYear(today));
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          setStartDate(customStartDate);
          setEndDate(customEndDate);
        }
        break;
    }
  }, [dateRangePreset, customStartDate, customEndDate]);

  // Filtrar agendamentos
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    
    if (selectedService !== 'all') {
      filtered = filtered.filter((app) => app.service_name === selectedService);
    }
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((app) => app.status === selectedStatus);
    }
    
    return filtered;
  }, [appointments, selectedService, selectedStatus]);

  // Dados para gráfico de status
  const statusData = useMemo(() => {
    const statusCounts = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    appointments.forEach((app) => {
      if (app.status in statusCounts) {
        statusCounts[app.status as keyof typeof statusCounts]++;
      }
    });

    return [
      { name: 'Pendente', value: statusCounts.pending, color: '#f59e0b' },
      { name: 'Confirmado', value: statusCounts.confirmed, color: '#3b82f6' },
      { name: 'Concluído', value: statusCounts.completed, color: '#10b981' },
      { name: 'Cancelado', value: statusCounts.cancelled, color: '#ef4444' },
    ].filter((item) => item.value > 0);
  }, [appointments]);

  // Função de exportação (placeholder)
  const handleExport = (format: 'pdf' | 'excel') => {
    toast.info(T(`Exportação ${format.toUpperCase()} em desenvolvimento`, `Export ${format.toUpperCase()} coming soon`));
  };

  if (isBusinessLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!businessId) {
    return (
      <Card className="p-6 text-center">
        <CardTitle className="text-xl mb-4">{T('Negócio Não Cadastrado', 'Business Not Registered')}</CardTitle>
        <p className="mb-4">{T('Você precisa cadastrar as informações do seu negócio antes de visualizar relatórios.', 'You need to register your business information before viewing reports.')}</p>
        <Button asChild>
          <a href="/register-business">{T('Cadastrar Meu Negócio', 'Register My Business')}</a>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            {T('Relatórios', 'Reports')}
          </h1>
          <p className="text-gray-600 mt-2">{T('Análise completa do desempenho do seu negócio', 'Complete analysis of your business performance')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <FileText className="h-4 w-4 mr-2" />
            {T('PDF', 'PDF')}
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {T('Excel', 'Excel')}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">{T('Período', 'Period')}</Label>
              <Select value={dateRangePreset} onValueChange={(value) => setDateRangePreset(value as DateRangePreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{T('Hoje', 'Today')}</SelectItem>
                  <SelectItem value="yesterday">{T('Ontem', 'Yesterday')}</SelectItem>
                  <SelectItem value="7days">{T('Últimos 7 dias', 'Last 7 days')}</SelectItem>
                  <SelectItem value="30days">{T('Últimos 30 dias', 'Last 30 days')}</SelectItem>
                  <SelectItem value="90days">{T('Últimos 90 dias', 'Last 90 days')}</SelectItem>
                  <SelectItem value="thisYear">{T('Este ano', 'This year')}</SelectItem>
                  <SelectItem value="custom">{T('Personalizado', 'Custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRangePreset === 'custom' && (
              <>
                <div>
                  <Label className="text-sm font-medium mb-2 block">{T('Data Inicial', 'Start Date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, 'dd/MM/yyyy', { locale: ptBR }) : T('Selecione', 'Select')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <ShadcnCalendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">{T('Data Final', 'End Date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, 'dd/MM/yyyy', { locale: ptBR }) : T('Selecione', 'Select')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <ShadcnCalendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div>
              <Label className="text-sm font-medium mb-2 block">{T('Serviço', 'Service')}</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{T('Todos', 'All')}</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.service_id} value={service.service_name}>
                      {service.service_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">{T('Status', 'Status')}</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{T('Todos', 'All')}</SelectItem>
                  <SelectItem value="pending">{T('Pendente', 'Pending')}</SelectItem>
                  <SelectItem value="confirmed">{T('Confirmado', 'Confirmed')}</SelectItem>
                  <SelectItem value="completed">{T('Concluído', 'Completed')}</SelectItem>
                  <SelectItem value="cancelled">{T('Cancelado', 'Cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">{T('Resumo', 'Summary')}</TabsTrigger>
          <TabsTrigger value="appointments">{T('Agendamentos', 'Appointments')}</TabsTrigger>
          <TabsTrigger value="financial">{T('Financeiro', 'Financial')}</TabsTrigger>
          <TabsTrigger value="clients">{T('Clientes', 'Clients')}</TabsTrigger>
        </TabsList>

        {/* 1. RESUMO GERAL */}
        <TabsContent value="summary" className="space-y-6">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Agendamentos Hoje', 'Today Appointments')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{summary.appointments_today}</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Agendamentos da Semana', 'Week Appointments')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{summary.appointments_week}</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Agendamentos do Mês', 'Month Appointments')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{summary.appointments_month}</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Taxa de Comparecimento', 'Attendance Rate')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{summary.attendance_rate.toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Receita Hoje', 'Today Revenue')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(summary.revenue_today, currentCurrency.key, currentCurrency.locale)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Receita da Semana', 'Week Revenue')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(summary.revenue_week, currentCurrency.key, currentCurrency.locale)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Receita do Mês', 'Month Revenue')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(summary.revenue_month, currentCurrency.key, currentCurrency.locale)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Cancelamentos', 'Cancellations')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summary.cancellations}</div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>{T('Receita por Período', 'Revenue by Period')}</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueLineChart data={revenue} currentCurrency={currentCurrency} />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>{T('Status dos Agendamentos', 'Appointments Status')}</CardTitle>
              </CardHeader>
              <CardContent>
                <AppointmentsStatusDonut data={statusData} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. RELATÓRIOS DE AGENDAMENTOS */}
        <TabsContent value="appointments" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>{T('Agendamentos', 'Appointments')}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {T('Total:', 'Total:')} {filteredAppointments.length} {T('agendamentos', 'appointments')}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <AppointmentsByDayChart 
                  data={revenue.map((r) => ({ date: r.date, appointments_count: r.appointments_count }))} 
                />
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{T('Cliente', 'Client')}</TableHead>
                        <TableHead>{T('Serviço', 'Service')}</TableHead>
                        <TableHead>{T('Preço', 'Price')}</TableHead>
                        <TableHead>{T('Data', 'Date')}</TableHead>
                        <TableHead>{T('Hora', 'Time')}</TableHead>
                        <TableHead>{T('Status', 'Status')}</TableHead>
                        <TableHead>{T('Código', 'Code')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.client_name}</TableCell>
                          <TableCell>{app.service_name}</TableCell>
                          <TableCell>{formatCurrency(app.service_price, currentCurrency.key, currentCurrency.locale)}</TableCell>
                          <TableCell>{format(parseISO(app.start_time), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                          <TableCell>{format(parseISO(app.start_time), 'HH:mm', { locale: ptBR })}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                app.status === 'completed' && 'bg-green-100 text-green-700 border-green-300',
                                app.status === 'confirmed' && 'bg-blue-100 text-blue-700 border-blue-300',
                                app.status === 'pending' && 'bg-yellow-100 text-yellow-700 border-yellow-300',
                                app.status === 'cancelled' && 'bg-red-100 text-red-700 border-red-300'
                              )}
                            >
                              {app.status === 'completed' && T('Concluído', 'Completed')}
                              {app.status === 'confirmed' && T('Confirmado', 'Confirmed')}
                              {app.status === 'pending' && T('Pendente', 'Pending')}
                              {app.status === 'cancelled' && T('Cancelado', 'Cancelled')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{app.client_code}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. RELATÓRIOS FINANCEIROS */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Receita Total', 'Total Revenue')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(
                    revenue.reduce((sum, r) => sum + r.revenue, 0),
                    currentCurrency.key,
                    currentCurrency.locale
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Ticket Médio', 'Average Ticket')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    revenue.length > 0
                      ? revenue.reduce((sum, r) => sum + r.revenue, 0) / revenue.reduce((sum, r) => sum + r.appointments_count, 0)
                      : 0,
                    currentCurrency.key,
                    currentCurrency.locale
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Total de Agendamentos', 'Total Appointments')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {revenue.reduce((sum, r) => sum + r.appointments_count, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>{T('Receita por Serviço', 'Revenue by Service')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ServicesBarChart 
                data={services.map((s) => ({
                  service_name: s.service_name,
                  total_revenue: s.total_revenue,
                  total_appointments: s.total_appointments,
                }))} 
                currentCurrency={currentCurrency}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. RELATÓRIOS DE CLIENTES */}
        <TabsContent value="clients" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Total de Clientes', 'Total Clients')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{clients.length}</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Clientes Recorrentes', 'Recurring Clients')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {clients.filter((c) => c.total_appointments > 1).length}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Clientes VIP', 'VIP Clients')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {clients.filter((c) => c.total_appointments >= 5).length}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{T('Clientes Novos', 'New Clients')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {clients.filter((c) => c.total_appointments === 1).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>{T('Lista de Clientes', 'Clients List')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{T('Nome', 'Name')}</TableHead>
                      <TableHead>{T('WhatsApp', 'WhatsApp')}</TableHead>
                      <TableHead>{T('Total Agendamentos', 'Total Appointments')}</TableHead>
                      <TableHead>{T('Última Visita', 'Last Visit')}</TableHead>
                      <TableHead>{T('Valor Total Gasto', 'Total Spent')}</TableHead>
                      <TableHead>{T('Status', 'Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.slice(0, 50).map((client, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{client.client_name}</TableCell>
                        <TableCell>{client.client_whatsapp}</TableCell>
                        <TableCell>{client.total_appointments}</TableCell>
                        <TableCell>
                          {client.last_visit
                            ? format(parseISO(client.last_visit), 'dd/MM/yyyy', { locale: ptBR })
                            : T('N/A', 'N/A')}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(client.total_revenue, currentCurrency.key, currentCurrency.locale)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              client.total_appointments >= 5 && 'bg-purple-100 text-purple-700 border-purple-300',
                              client.total_appointments > 1 && client.total_appointments < 5 && 'bg-blue-100 text-blue-700 border-blue-300',
                              client.total_appointments === 1 && 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            )}
                          >
                            {client.total_appointments >= 5 && T('VIP', 'VIP')}
                            {client.total_appointments > 1 && client.total_appointments < 5 && T('Recorrente', 'Recurring')}
                            {client.total_appointments === 1 && T('Novo', 'New')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
