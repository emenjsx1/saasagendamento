import React from 'react';
import { useBusiness } from '@/hooks/use-business';
import { Loader2, Link as LinkIcon } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DashboardPage = () => {
  const { business, isLoading, isRegistered, businessId } = useBusiness();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not registered, redirect to registration page
  if (!isRegistered) {
    return <Navigate to="/register-business" replace />;
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/book/${businessId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de agendamento copiado!");
  };

  // Display Dashboard content
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Bem-vindo, {business?.name}!</h1>
      <p className="text-gray-600">Visão geral e estatísticas do seu negócio.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Link de Agendamento</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold mb-2">Seu Link Público</p>
            <p className="text-sm text-muted-foreground truncate">
              {window.location.origin}/book/{businessId}
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handleCopyLink}>
              Copiar Link
            </Button>
          </CardContent>
        </Card>
        
        {/* Placeholder for future stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Agendamentos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Nenhum novo agendamento hoje.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Serviços Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Link to="/dashboard/services" className="text-primary hover:underline">Gerenciar</Link>
            </div>
            <p className="text-xs text-muted-foreground">Configure seus serviços e preços.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;