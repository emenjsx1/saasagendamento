import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Briefcase, CalendarCheck, DollarSign, ArrowRight, Loader2, BarChart3, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
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
  
  const { currentCurrency } = useCurrency();
  
  const [recentBusinesses, setRecentBusinesses] = useState<any[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [isRecentLoading, setIsRecentLoading] = useState(true);

  // Fetch Recent Activity
  useEffect(() => {
    const fetchRecentActivity = async () => {
      setIsRecentLoading(true);

      // 1. Últimos Negócios Cadastrados (Last 5)
      const { data: bizData } = await supabase
        .from('businesses')
        .select('name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentBusinesses(bizData || []);

      // 2. Últimos Agendamentos (Last 5)
      const { data: appData } = await supabase
        .from('appointments')
        .select(`
          client_name, 
          start_time, 
          services (name), 
          businesses (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      const mappedApps = (appData || []).map((app: any) => {
        const service = Array.isArray(app.services) ? app.services[0]?.name : app.services?.name || 'N/A';
        const business = Array.isArray(app.businesses) ? app.businesses[0]?.name : app.businesses?.name || 'N/A';
        
        return {
          client: app.client_name,
          service: service,
          business: business,
          time: format(parseISO(app.start_time), 'HH:mm'),
        };
      });
      
      setRecentAppointments(mappedApps);
      setIsRecentLoading(false);
    };

    fetchRecentActivity();
  }, []);

  const isLoading = isMetricsLoading || isRecentLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  const metrics = [
    { title: 'Total de Negócios', value: totalBusinesses.toString(), icon: Briefcase, color: 'text-blue-600' },
    { title: 'Total de Usuários', value: totalUsers.toString(), icon: Users, color: 'text-green-600' },
    { title: 'Agendamentos (30 dias)', value: totalAppointmentsLast30Days.toString(), icon: CalendarCheck, color: 'text-yellow-600' },
    { title: 'Receita Total (30 dias)', value: formatCurrency(totalRevenueLast30Days, currentCurrency.key, currentCurrency.locale), icon: DollarSign, color: 'text-red-600' },
  ];
  
  const todayMetrics = [
    { title: 'Agendamentos de Hoje', value: appointmentsToday.toString(), icon: Clock, color: 'text-primary', link: '/admin/appointments' },
    { title: 'Receita de Hoje (Concluída)', value: formatCurrency(revenueToday, currentCurrency.key, currentCurrency.locale), icon: DollarSign, color: 'text-green-600', link: '/admin/reports' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center text-red-600">
        <Shield className="h-7 w-7 mr-3" />
        Visão Geral da Plataforma
      </h1>
      
      {/* Visão Geral - Métricas (30 dias) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className={cn("h-4 w-4", metric.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Métricas de Hoje e Status de Assinatura */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Métricas de Hoje */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">Desempenho de Hoje ({format(new Date(), 'dd/MM')})</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {todayMetrics.map((metric) => (
              <Card key={metric.title} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{metric.title}</p>
                  <metric.icon className={cn("h-4 w-4", metric.color)} />
                </div>
                <div className="text-xl font-bold mt-1">{metric.value}</div>
                <Button asChild variant="link" size="sm" className="p-0 h-auto mt-2">
                  <Link to={metric.link}>Ver Detalhes</Link>
                </Button>
              </Card>
            ))}
          </CardContent>
        </Card>
        
        {/* Status das Assinaturas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Status das Assinaturas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="flex items-center text-sm font-medium text-green-600"><CheckCircle className="h-4 w-4 mr-2" /> Ativas (Pagas)</span>
              <Badge variant="default" className="bg-green-600">{subscriptionStatus.active}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center text-sm font-medium text-yellow-600"><Clock className="h-4 w-4 mr-2" /> Teste Gratuito</span>
              <Badge variant="secondary">{subscriptionStatus.trial}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center text-sm font-medium text-red-600"><AlertTriangle className="h-4 w-4 mr-2" /> Pagamento Pendente</span>
              <Badge variant="destructive">{subscriptionStatus.pending_payment}</Badge>
            </div>
            <Button asChild variant="link" size="sm" className="p-0 pt-2">
              <Link to="/admin/businesses">Gerir Assinaturas <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Botões de Ação Rápida */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button asChild variant="default" className="bg-red-600 hover:bg-red-700">
          <Link to="/admin/businesses">
            <Briefcase className="h-4 w-4 mr-2" /> Gerir Negócios
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/admin/users">
            <Users className="h-4 w-4 mr-2" /> Gerir Usuários
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/reports">
            <BarChart3 className="h-4 w-4 mr-2" /> Ver Relatórios
          </Link>
        </Button>
      </div>

      {/* Atividade Recente (Mantido) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Últimos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum agendamento recente.</p>
            ) : (
                recentAppointments.map((app, index) => (
                <div key={index} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                    <div>
                    <p className="font-medium">{app.client} ({app.service})</p>
                    <p className="text-xs text-muted-foreground">{app.business}</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">{app.time}</p>
                </div>
                ))
            )}
            <Button variant="link" size="sm" className="p-0 pt-2" asChild>
              <Link to="/admin/appointments">Ver todos <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Últimos Negócios Cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentBusinesses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum negócio recente.</p>
            ) : (
                recentBusinesses.map((biz, index) => (
                <div key={index} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                    <p className="font-medium">{biz.name}</p>
                    <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(parseISO(biz.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                </div>
                ))
            )}
            <Button variant="link" size="sm" className="p-0 pt-2" asChild>
              <Link to="/admin/businesses">Ver todos <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;