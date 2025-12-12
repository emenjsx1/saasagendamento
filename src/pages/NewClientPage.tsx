import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientForm } from '@/components/ClientForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useCurrency } from '@/contexts/CurrencyContext';

export default function NewClientPage() {
  const navigate = useNavigate();
  const { T } = useCurrency();

  const handleSuccess = () => {
    navigate('/dashboard/clients');
  };

  const handleCancel = () => {
    navigate('/dashboard/clients');
  };

  return (
    <div className="space-y-6 p-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-2xl">
          <Link to="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold">
          {T('Novo Cliente', 'New Client')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{T('Informações do Cliente', 'Client Information')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </div>
  );
}


