import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Briefcase, CalendarCheck, DollarSign, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const AdminDashboardPage: React.FC = () => {
  // Dados de exemplo (placeholders)
  const metrics = [
    { title: 'Total de Negócios', value: '42', icon: Briefcase, color: 'text-blue-600' },
    { title: 'Total de Usuários', value: '1,200', icon: Users, color: 'text-green-600' },
    { title: 'Agendamentos no Mês', value: '5,800', icon: CalendarCheck, color: 'text-yellow-600' },
    { title: 'Receita Total (Mês)', value: 'MZN 150,000', icon: DollarSign, color: 'text-red-600' },
  ];

  const recentBusinesses = [
    { name: 'Barbearia Alpha', date: '2 horas atrás' },
    { name: 'Salão Beleza Divina', date: 'Ontem' },
    { name: 'Consultório Dr. Silva', date: '2 dias atrás' },
  ];

  const recentAppointments = [
    { client: 'Maria Joana', service: 'Corte', business: 'Barbearia Alpha', time: '10:00' },
    { client: 'João Pedro', service: 'Massagem', business: 'Spa Relax', time: '14:30' },
    { client: 'Ana Clara', service: 'Manicure', business: 'Salão Divina', time: '16:00' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center text-red-600">
        <Shield className="h-7 w-7 mr-3" />
        Visão Geral da Plataforma
      </h1>
      
      {/* Visão Geral - Métricas */}
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

      {/* Atividade Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Últimos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAppointments.map((app, index) => (
              <div key={index} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                <div>
                  <p className="font-medium">{app.client} ({app.service})</p>
                  <p className="text-xs text-muted-foreground">{app.business}</p>
                </div>
                <p className="text-sm font-semibold text-primary">{app.time}</p>
              </div>
            ))}
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
            {recentBusinesses.map((biz, index) => (
              <div key={index} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                <p className="font-medium">{biz.name}</p>
                <p className="text-sm text-muted-foreground">{biz.date}</p>
              </div>
            ))}
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