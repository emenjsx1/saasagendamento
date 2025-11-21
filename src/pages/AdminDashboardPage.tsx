import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Briefcase, CalendarCheck, DollarSign, ArrowRight, Loader2, BarChart3, Clock, CheckCircle, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn, formatCurrency } from '@/lib/utils';
import { useAdminMetrics } from '@/hooks/use-admin-metrics';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';

const AdminDashboardPage: React.FC = () => {
  const { 
    totalBusinesses, 
    totalUsers, 
    totalAppointmentsLast30Days, 
    totalRevenueLast30Days, 
    appointmentsToday,
    revenueToday,
    subscriptionStatus,
    isLoading: isMetricsLoading 
  } = useAdminMetrics();
  
  const { currentCurrency, T } = useCurrency();
  
  const [recentBusinesses, setRecentBusinesses] = useState<any[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [isRecentLoading, setIsRecentLoading] = useState(true);

  // Fetch Recent Activity
  useEffect(() => {
    const fetchRecentActivity = async () => {
      setIsRecentLoading(true);

      try {
        // 1. Últimos Negócios Cadastrados (Last 5)
        const { data: bizData, error: bizError } = await supabase
          .from('businesses')
          .select('id, name, created_at, slug')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (bizError) throw bizError;
        setRecentBusinesses(bizData || []);

        // 2. Últimos Agendamentos (Last 5)
        const { data: appData, error: appError } = await supabase
          .from('appointments')
          .select(`
            id,
            client_name, 
            start_time, 
            status,
            services (name, price), 
            businesses (name, slug)
          `)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (appError) throw appError;
        
        const mappedApps = (appData || []).map((app: any) => {
          const service = Array.isArray(app.services) ? app.services[0] : app.services;
          const business = Array.isArray(app.businesses) ? app.businesses[0] : app.businesses;
          
          return {
            id: app.id,
            client: app.client_name,
            service: service?.name || 'N/A',
            business: business?.name || 'N/A',
            businessSlug: business?.slug,
            time: format(parseISO(app.start_time), 'HH:mm'),
            date: format(parseISO(app.start_time), 'dd/MM'),
            status: app.status,
            price: service?.price || 0,
          };
        });
        
        setRecentAppointments(mappedApps);
      } catch (error: any) {
        console.error('Erro ao buscar atividade recente:', error);
      } finally {
        setIsRecentLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  const isLoading = isMetricsLoading || isRecentLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const metrics = [
    { 
      title: T('Total de Negócios', 'Total Businesses'), 
      value: totalBusinesses.toString(), 
      icon: Briefcase, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      link: '/admin/businesses'
    },
    { 
      title: T('Total de Usuários', 'Total Users'), 
      value: totalUsers.toString(), 
      icon: Users, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      link: '/admin/users'
    },
    { 
      title: T('Agendamentos (30 dias)', 'Appointments (30 days)'), 
      value: totalAppointmentsLast30Days.toString(), 
      icon: CalendarCheck, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      link: '/admin/appointments'
    },
    { 
      title: T('Receita Total (30 dias)', 'Total Revenue (30 days)'), 
      value: formatCurrency(totalRevenueLast30Days, currentCurrency.key, currentCurrency.locale), 
      icon: DollarSign, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      link: '/admin/payments'
    },
  ];
  
  const todayMetrics = [
    { 
      title: T('Agendamentos de Hoje', 'Today\'s Appointments'), 
      value: appointmentsToday.toString(), 
      icon: Clock, 
      color: 'text-primary',
      link: '/admin/appointments'
    },
    { 
      title: T('Receita de Hoje', 'Today\'s Revenue'), 
      value: formatCurrency(revenueToday, currentCurrency.key, currentCurrency.locale), 
      icon: TrendingUp, 
      color: 'text-green-600',
      link: '/admin/payments'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
              <Shield className="h-7 w-7 text-white" />
            </div>
            {T('Visão Geral da Plataforma', 'Platform Overview')}
          </h1>
          <p className="text-gray-600 mt-2">{T('Monitoramento completo do sistema', 'Complete system monitoring')}</p>
        </div>
      </div>
      
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{metric.title}</CardTitle>
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", metric.bgColor)}>
                <metric.icon className={cn("h-5 w-5", metric.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">{metric.value}</div>
              <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                <Link to={metric.link} className="text-xs">
                  {T('Ver detalhes', 'View details')} <ArrowRight className="h-3 w-3 ml-1 inline" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Métricas de Hoje e Status de Assinatura */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Métricas de Hoje */}
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {T('Desempenho de Hoje', 'Today\'s Performance')} ({format(new Date(), 'dd/MM', { locale: ptBR })})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {todayMetrics.map((metric) => (
              <div key={metric.title} className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <metric.icon className={cn("h-5 w-5", metric.color)} />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-2">{metric.value}</div>
                <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs">
                  <Link to={metric.link}>{T('Ver Detalhes', 'View Details')} <ArrowRight className="h-3 w-3 ml-1 inline" /></Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Status das Assinaturas */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {T('Status das Assinaturas', 'Subscription Status')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 border border-green-200">
              <span className="flex items-center text-sm font-medium text-green-700">
                <CheckCircle className="h-4 w-4 mr-2" /> 
                {T('Ativas', 'Active')}
              </span>
              <Badge className="bg-green-600 text-white">{subscriptionStatus.active}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <span className="flex items-center text-sm font-medium text-yellow-700">
                <Clock className="h-4 w-4 mr-2" /> 
                {T('Teste Gratuito', 'Free Trial')}
              </span>
              <Badge variant="secondary">{subscriptionStatus.trial}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 border border-red-200">
              <span className="flex items-center text-sm font-medium text-red-700">
                <AlertTriangle className="h-4 w-4 mr-2" /> 
                {T('Pagamento Pendente', 'Pending Payment')}
              </span>
              <Badge variant="destructive">{subscriptionStatus.pending_payment}</Badge>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full mt-2">
              <Link to="/admin/businesses">
                {T('Gerir Assinaturas', 'Manage Subscriptions')} <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{T('Ações Rápidas', 'Quick Actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button asChild variant="default" className="h-auto py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
              <Link to="/admin/businesses" className="flex items-center justify-center">
                <Briefcase className="h-5 w-5 mr-2" /> 
                {T('Gerir Negócios', 'Manage Businesses')}
              </Link>
            </Button>
            <Button asChild variant="default" className="h-auto py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
              <Link to="/admin/users" className="flex items-center justify-center">
                <Users className="h-5 w-5 mr-2" /> 
                {T('Gerir Usuários', 'Manage Users')}
              </Link>
            </Button>
            <Button asChild variant="default" className="h-auto py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">
              <Link to="/admin/reports" className="flex items-center justify-center">
                <BarChart3 className="h-5 w-5 mr-2" /> 
                {T('Ver Relatórios', 'View Reports')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Atividade Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold">{T('Últimos Agendamentos', 'Recent Appointments')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/appointments">
                {T('Ver todos', 'View all')} <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAppointments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">{T('Nenhum agendamento recente.', 'No recent appointments.')}</p>
            ) : (
              recentAppointments.map((app) => (
                <div key={app.id} className="flex justify-between items-start p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{app.client}</p>
                    <p className="text-sm text-gray-600">{app.service} - {app.business}</p>
                    <p className="text-xs text-gray-500 mt-1">{app.date} às {app.time}</p>
                  </div>
                  <Badge variant={app.status === 'confirmed' ? 'default' : app.status === 'completed' ? 'default' : 'secondary'}>
                    {app.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold">{T('Últimos Negócios', 'Recent Businesses')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/businesses">
                {T('Ver todos', 'View all')} <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentBusinesses.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">{T('Nenhum negócio recente.', 'No recent businesses.')}</p>
            ) : (
              recentBusinesses.map((biz) => (
                <div key={biz.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-semibold text-gray-900">{biz.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(parseISO(biz.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/book/${biz.slug}`} target="_blank">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
