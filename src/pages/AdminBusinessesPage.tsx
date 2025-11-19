import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase, Loader2, Search, Filter, Edit, Trash2, ToggleLeft, ToggleRight, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Business {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  owner_email: string;
  subscription_status: string;
  is_active: boolean; // Simulado
}

const AdminBusinessesPage: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBusinesses = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from('businesses')
      .select(`
        id, 
        name, 
        slug, 
        owner_id, 
        created_at,
        auth_users:owner_id (email),
        subscriptions:owner_id (status)
      `);

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      toast.error("Erro ao carregar negócios.");
      console.error(error);
    } else {
      const mappedData: Business[] = (data || []).map((b: any) => {
        // Supabase returns related data as arrays if multiple rows match, 
        // but for owner_id (unique user ID), it should be a single object or array of one.
        const ownerEmail = Array.isArray(b.auth_users) ? b.auth_users[0]?.email : b.auth_users?.email || 'N/A';
        const subStatus = Array.isArray(b.subscriptions) ? b.subscriptions[0]?.status : b.subscriptions?.status || 'N/A';
        
        return {
          id: b.id,
          name: b.name,
          slug: b.slug,
          owner_id: b.owner_id,
          created_at: b.created_at,
          owner_email: ownerEmail,
          subscription_status: subStatus,
          is_active: true, // Placeholder
        };
      });
      setBusinesses(mappedData);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBusinesses();
  }, [searchTerm]);

  const handleToggleActive = (business: Business) => {
    // Lógica de ativação/inativação (requer coluna 'is_active' na tabela 'businesses')
    toast.info(`Funcionalidade de Ativar/Inativar Negócio para ${business.name} em desenvolvimento.`);
  };

  const handleDelete = (business: Business) => {
    if (window.confirm(`Tem certeza que deseja excluir o negócio ${business.name}? Esta ação é irreversível.`)) {
      // Lógica de exclusão
      toast.info(`Funcionalidade de Excluir Negócio para ${business.name} em desenvolvimento.`);
    }
  };
  
  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100/80">Ativo</Badge>;
      case 'pending_payment':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80">Pagamento Pendente</Badge>;
      case 'trial':
        return <Badge variant="secondary">Teste Gratuito</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center text-red-600">
        <Briefcase className="h-7 w-7 mr-3" />
        Gestão de Negócios
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Listagem de Negócios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4 space-x-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do negócio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={fetchBusinesses}>
              <Filter className="h-4 w-4 mr-2" /> Filtrar
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
          ) : businesses.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum negócio encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Proprietário</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status Negócio</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((business) => (
                    <TableRow key={business.id}>
                      <TableCell className="font-medium">
                        {business.name}
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{business.slug}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" /> {business.owner_email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getSubscriptionBadge(business.subscription_status)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            business.is_active ? 'bg-green-100 text-green-700 hover:bg-green-100/80' : 'bg-red-100 text-red-700 hover:bg-red-100/80'
                          )}
                        >
                          {business.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(business.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="secondary" size="icon" onClick={() => handleToggleActive(business)} title={business.is_active ? 'Inativar' : 'Ativar'}>
                          {business.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-red-600" />}
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(business)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBusinessesPage;