import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase, Loader2, Search, Edit, Trash2, Mail, Calendar, User, ExternalLink, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AdminBusinessDetailsDialog from '@/components/admin/AdminBusinessDetailsDialog';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Business {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  owner_email: string;
  owner_name: string;
  subscription_status: string;
  plan_name: string;
  renewal_date: string | null;
  appointment_count: number;
  is_active: boolean;
}

const AdminBusinessesPage: React.FC = () => {
  const { T } = useCurrency();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  const fetchBusinesses = async () => {
    setIsLoading(true);
    
    try {
      // Buscar negócios
      let businessesQuery = supabase
      .from('businesses')
        .select('id, name, slug, owner_id, created_at');

    if (searchTerm) {
        businessesQuery = businessesQuery.ilike('name', `%${searchTerm}%`);
      }

      const { data: businessesData, error: businessesError } = await businessesQuery.order('created_at', { ascending: false });

      if (businessesError) {
        toast.error(T("Erro ao carregar negócios: ", "Error loading businesses: ") + businessesError.message);
        console.error(businessesError);
        setIsLoading(false);
        return;
      }

      if (!businessesData || businessesData.length === 0) {
        setBusinesses([]);
        setIsLoading(false);
        return;
      }

      // Buscar perfis e assinaturas separadamente
      const ownerIds = businessesData.map(b => b.owner_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', ownerIds);

      if (profilesError) {
        console.error('Erro ao buscar perfis:', profilesError);
      }

      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('user_id, status, plan_name, trial_ends_at, created_at')
        .in('user_id', ownerIds)
        .order('created_at', { ascending: false });

      if (subscriptionsError) {
        console.error('Erro ao buscar assinaturas:', subscriptionsError);
      }

      // Criar mapas para lookup rápido
      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
      const subscriptionsMap = new Map();
      
      // Pegar a assinatura mais recente de cada usuário
      (subscriptionsData || []).forEach(s => {
        if (!subscriptionsMap.has(s.user_id)) {
          subscriptionsMap.set(s.user_id, s);
        }
      });

      // Buscar contagem de agendamentos por negócio
      const businessIds = businessesData.map(b => b.id);
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('business_id')
        .in('business_id', businessIds);

      const appointmentCounts = new Map<string, number>();
      (appointmentsData || []).forEach(apt => {
        appointmentCounts.set(apt.business_id, (appointmentCounts.get(apt.business_id) || 0) + 1);
      });

      // Mapear dados
      const mappedData: Business[] = businessesData.map((b: any) => {
        const profile = profilesMap.get(b.owner_id);
        const subscription = subscriptionsMap.get(b.owner_id);
        
        const ownerName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'N/A';
        const ownerEmail = profile?.email || 'N/A';
        
        const subStatus = subscription?.status || 'N/A';
        const planName = subscription?.plan_name || 'N/A';
        
        let renewalDate: string | null = null;
        if (subStatus === 'trial' && subscription?.trial_ends_at) {
            renewalDate = format(parseISO(subscription.trial_ends_at), 'dd/MM/yyyy', { locale: ptBR });
        }
        
        return {
          id: b.id,
          name: b.name,
          slug: b.slug,
          owner_id: b.owner_id,
          created_at: b.created_at,
          owner_email: ownerEmail,
          owner_name: ownerName,
          subscription_status: subStatus,
          plan_name: planName,
          renewal_date: renewalDate,
          appointment_count: appointmentCounts.get(b.id) || 0,
          is_active: true,
        };
      });
      
      setBusinesses(mappedData);
    } catch (error: any) {
      console.error('Erro ao buscar negócios:', error);
      toast.error(T("Erro ao carregar negócios.", "Error loading businesses."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [searchTerm, refreshKey]);

  const handleEditClick = (id: string) => {
    setSelectedBusinessId(id);
    setIsModalOpen(true);
  };
  
  const handleModalSuccess = () => {
      setRefreshKey(prev => prev + 1);
  };

  const handleDelete = async (business: Business) => {
    if (!window.confirm(T(`Tem certeza que deseja excluir o negócio ${business.name}? Esta ação é irreversível.`, `Are you sure you want to delete the business ${business.name}? This action is irreversible.`))) {
      return;
    }

    try {
      // Primeiro, deletar serviços relacionados
      await supabase
        .from('services')
        .delete()
        .eq('business_id', business.id);

      // Depois, deletar agendamentos relacionados
      await supabase
        .from('appointments')
        .delete()
        .eq('business_id', business.id);

      // Por fim, deletar o negócio
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', business.id);

      if (error) throw error;

      toast.success(T("Negócio excluído com sucesso.", "Business deleted successfully."));
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Erro ao excluir negócio:', error);
      toast.error(T("Erro ao excluir negócio: ", "Error deleting business: ") + error.message);
    }
  };
  
  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100/80 border-green-300">{T('Ativo', 'Active')}</Badge>;
      case 'pending_payment':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80 border-yellow-300">{T('Pagamento Pendente', 'Pending Payment')}</Badge>;
      case 'trial':
        return <Badge variant="secondary">{T('Teste Gratuito', 'Free Trial')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Briefcase className="h-7 w-7 text-white" />
            </div>
            {T('Gestão de Negócios', 'Business Management')}
      </h1>
          <p className="text-gray-600 mt-2">{T('Gerencie todos os negócios cadastrados na plataforma', 'Manage all businesses registered on the platform')}</p>
        </div>
      </div>
      
      {/* Search and Filters */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{T('Listagem de Negócios', 'Business List')} ({businesses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mb-6">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={T("Buscar por nome do negócio...", "Search by business name...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={fetchBusinesses}>
              {T('Atualizar', 'Refresh')}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{T('Nenhum negócio encontrado.', 'No businesses found.')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{T('Negócio', 'Business')}</TableHead>
                    <TableHead>{T('Proprietário', 'Owner')}</TableHead>
                    <TableHead>{T('Plano', 'Plan')}</TableHead>
                    <TableHead>{T('Status', 'Status')}</TableHead>
                    <TableHead>{T('Agendamentos', 'Appointments')}</TableHead>
                    <TableHead>{T('Cadastro', 'Registered')}</TableHead>
                    <TableHead className="text-right">{T('Ações', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((business) => (
                    <TableRow key={business.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold text-gray-900">{business.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{business.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-gray-900">{business.owner_name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {business.owner_email}
                            </p>
                        </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{business.plan_name}</Badge>
                      </TableCell>
                      <TableCell>
                        {getSubscriptionBadge(business.subscription_status)}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-gray-900">{business.appointment_count}</span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(parseISO(business.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title={T('Ver página', 'View page')}
                            asChild
                          >
                            <a href={`/book/${business.slug}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                            </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            title={T('Editar', 'Edit')}
                            onClick={() => handleEditClick(business.id)}
                          >
                          <Edit className="h-4 w-4" />
                        </Button>
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            title={T('Excluir', 'Delete')}
                            onClick={() => handleDelete(business)}
                          >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de Edição */}
      {selectedBusinessId && (
        <AdminBusinessDetailsDialog
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          businessId={selectedBusinessId}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default AdminBusinessesPage;
