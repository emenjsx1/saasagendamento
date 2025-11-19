import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

const AdminAppointmentsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center text-red-600">
        <Calendar className="h-7 w-7 mr-3" />
        Controle de Agendamentos (Global)
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Monitoramento de Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aqui o administrador poderá visualizar, filtrar e gerenciar todos os agendamentos de todos os negócios na plataforma.</p>
          <p className="mt-2 font-semibold">Status: Funcionalidade em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAppointmentsPage;