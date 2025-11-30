import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Loader2, DollarSign, TrendingUp, Calendar, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigate } from 'react-router-dom';
import { ClientBottomNavigator } from '@/components/ClientBottomNavigator';

interface FinanceSummary {
  totalSpent: number;
  totalAppointments: number;
  completedAppointments: number;
  averageSpent: number;
}

export default function ClientFinancePage() {
  const { user } = useSession();
  const { T, currentCurrency } = useCurrency();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<FinanceSummary>({
    totalSpent: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    averageSpent: 0,
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'month' | '3months' | '6months' | 'year'>('all');
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchFinanceData = async () => {
      setIsLoading(true);
      try {
        // Calcular período
        let startDate: Date | null = null;
        if (selectedPeriod !== 'all') {
          const now = new Date();
          switch (selectedPeriod) {
            case 'month':
              startDate = startOfMonth(now);
              break;
            case '3months':
              startDate = startOfMonth(subMonths(now, 3));
              break;
            case '6months':
              startDate = startOfMonth(subMonths(now, 6));
              break;
            case 'year':
              startDate = startOfMonth(subMonths(now, 12));
              break;
          }
        }

        // Buscar agendamentos do cliente
        let query = supabase
          .from('appointments')
          .select(`
            id,
            start_time,
            status,
            services:service_id (
              name,
              price
            )
          `)
          .eq('user_id', user.id);

        if (startDate) {
          query = query.gte('start_time', startDate.toISOString());
        }

        const { data, error } = await query.order('start_time', { ascending: false });

        if (error) {
          console.error('Erro ao buscar agendamentos:', error);
          return;
        }

        setAppointments(data || []);

        // Calcular estatísticas
        const completed = data?.filter((a: any) => a.status === 'completed') || [];
        const totalSpent = completed.reduce((sum: number, a: any) => sum + (a.services?.price || 0), 0);
        const totalAppointments = data?.length || 0;
        const completedCount = completed.length;
        const averageSpent = completedCount > 0 ? totalSpent / completedCount : 0;

        setSummary({
          totalSpent,
          totalAppointments,
          completedAppointments: completedCount,
          averageSpent,
        });
      } catch (error) {
        console.error('Erro ao carregar dados financeiros:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFinanceData();
  }, [user, selectedPeriod]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-gray-800 text-white py-12 rounded-b-3xl">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{T('Meus Gastos', 'My Expenses')}</h1>
          <p className="text-gray-300 text-sm md:text-base">
            {T('Acompanhe seus gastos com serviços agendados', 'Track your spending on booked services')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8 pb-20 md:pb-8">
        {/* Filtro de Período */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium">{T('Período:', 'Period:')}</span>
              <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{T('Todos os tempos', 'All time')}</SelectItem>
                  <SelectItem value="month">{T('Este mês', 'This month')}</SelectItem>
                  <SelectItem value="3months">{T('Últimos 3 meses', 'Last 3 months')}</SelectItem>
                  <SelectItem value="6months">{T('Últimos 6 meses', 'Last 6 months')}</SelectItem>
                  <SelectItem value="year">{T('Último ano', 'Last year')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {T('Total Gasto', 'Total Spent')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.totalSpent, currentCurrency.key, currentCurrency.locale)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {T('Total Agendamentos', 'Total Appointments')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalAppointments}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {T('Concluídos', 'Completed')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">{summary.completedAppointments}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {T('Média por Serviço', 'Average per Service')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.averageSpent, currentCurrency.key, currentCurrency.locale)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Agendamentos */}
            <Card>
              <CardHeader>
                <CardTitle>{T('Histórico de Gastos', 'Spending History')}</CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {T('Nenhum agendamento encontrado neste período.', 'No appointments found in this period.')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((appointment: any) => {
                      const date = new Date(appointment.start_time);
                      const isCompleted = appointment.status === 'completed';
                      
                      return (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {appointment.services?.name || T('Serviço', 'Service')}
                            </p>
                            <p className="text-sm text-gray-500">
                              {format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                              {isCompleted
                                ? formatCurrency(appointment.services?.price || 0, currentCurrency.key, currentCurrency.locale)
                                : '-'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {appointment.status === 'completed'
                                ? T('Concluído', 'Completed')
                                : appointment.status === 'pending'
                                ? T('Pendente', 'Pending')
                                : appointment.status === 'confirmed'
                                ? T('Confirmado', 'Confirmed')
                                : appointment.status}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <ClientBottomNavigator />
    </div>
  );
}

