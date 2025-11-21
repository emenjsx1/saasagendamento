import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Loader2, Search, Filter, Edit, Trash2, UserCheck, UserX, Briefcase, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEmailNotifications } from '@/hooks/use-email-notifications';
import { useAdminSettings } from '@/hooks/use-admin-settings';
import { replaceEmailTemplate } from '@/utils/email-template-replacer';

interface UserProfile {
  id: string;
  email: string; 
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  role: 'Admin' | 'Owner' | 'Client';
  is_active: boolean;
  business_name: string | null;
  subscription_status: string;
  plan_name: string;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { sendEmail } = useEmailNotifications();
  const { settings } = useAdminSettings();

  const fetchUsers = async () => {
    setIsLoading(true);
    
    try {
      // 1. Buscar todos os perfis
      let profilesQuery = supabase
        .from('profiles')
        .select('id, email, first_name, last_name, created_at');

      if (searchTerm) {
        profilesQuery = profilesQuery.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data: profilesData, error: profilesError } = await profilesQuery;

      if (profilesError) {
        toast.error("Erro ao carregar perfis de usuários.");
        console.error(profilesError);
        setIsLoading(false);
        return;
      }

      if (!profilesData || profilesData.length === 0) {
        setUsers([]);
        setIsLoading(false);
        return;
      }

      // 2. Buscar administradores e donos de negócios para determinar o papel
      const { data: adminData } = await supabase.from('admin_users').select('user_id');
      const adminIds = new Set(adminData?.map(a => a.user_id) || []);
      
      const { data: businessData } = await supabase.from('businesses').select('owner_id, name');
      const businessMap = new Map(businessData?.map(b => [b.owner_id, b.name]) || []);
      
      // 3. Buscar subscriptions separadamente
      const userIds = profilesData.map(p => p.id);
      const { data: subscriptionsData } = await supabase
        .from('subscriptions')
        .select('user_id, status, plan_name')
        .in('user_id', userIds);
      
      const subscriptionsMap = new Map(
        (subscriptionsData || []).map(s => [s.user_id, { status: s.status, plan_name: s.plan_name }])
      );
      
      // 4. Mapear e combinar
      const mappedUsers: UserProfile[] = profilesData.map((p: any) => {
        const isAdministrator = adminIds.has(p.id);
        const businessName = businessMap.get(p.id) || null;
        const isOwner = !!businessName;
        
        const subscription = subscriptionsMap.get(p.id);
        const subStatus = subscription?.status || 'N/A';
        const planName = subscription?.plan_name || 'N/A';
        
        let role: UserProfile['role'] = 'Client';
        if (isAdministrator) {
          role = 'Admin';
        } else if (isOwner) {
          role = 'Owner';
        }
        
        return {
          id: p.id,
          email: p.email || 'N/A', 
          first_name: p.first_name,
          last_name: p.last_name,
          created_at: p.created_at,
          role: role,
          is_active: true,
          business_name: businessName,
          subscription_status: subStatus,
          plan_name: planName,
        };
      });

      setUsers(mappedUsers);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      toast.error("Erro ao carregar usuários.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  const handleToggleActive = (user: UserProfile) => {
    toast.info(`Funcionalidade de Ativar/Inativar Usuário para ${user.email} em desenvolvimento.`);
  };

  const handleDelete = (user: UserProfile) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário ${user.email}? Esta ação é irreversível.`)) {
      toast.info(`Funcionalidade de Excluir Usuário para ${user.email} em desenvolvimento.`);
    }
  };
  
  const handleSendPaymentReminder = async (user: UserProfile) => {
    if (user.subscription_status !== 'pending_payment') {
      toast.warning(`O usuário ${user.email} não está com pagamento pendente.`);
      return;
    }

    try {
      const loadingToast = toast.loading(`Enviando lembrete de pagamento para ${user.email}...`);
      
      // Buscar dados do pagamento pendente
      const { data: pendingPayments, error: paymentError } = await supabase
        .from('payments')
        .select('amount, id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .eq('payment_type', 'subscription')
        .order('payment_date', { ascending: false })
        .limit(1);

      if (paymentError) {
        console.error('Erro ao buscar pagamento pendente:', paymentError);
        toast.error(`Erro ao buscar pagamento: ${paymentError.message}`, { id: loadingToast });
        return;
      }

      const pendingPayment = pendingPayments && pendingPayments.length > 0 ? pendingPayments[0] : null;

      if (!pendingPayment) {
        toast.error(`Não foi encontrado pagamento pendente para ${user.email}.`, { id: loadingToast });
        return;
      }

      // Buscar valor do plano se não houver pagamento pendente específico
      let paymentAmount = pendingPayment.amount;
      if (!paymentAmount) {
        // Tentar buscar da subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan_name')
          .eq('user_id', user.id)
          .single();
        
        // Valor padrão se não encontrar
        paymentAmount = 588; // Valor padrão mensal
      }

      // Buscar template de email
      const template = settings?.email_templates?.payment_reminder || {
        subject: "💳 Lembrete de Pagamento: Sua Assinatura",
        body: "<h1>Pagamento Pendente</h1><p>Olá, seu plano {{plan_name}} está com pagamento pendente. Por favor, finalize o pagamento de {{price}} para continuar usando a plataforma.</p>"
      };

      // Preparar dados para o template
      const businessData = {
        logo_url: '',
        theme_color: '#16a34a',
        name: 'AgenCode',
        phone: '',
        address: '',
      };

      // Substituir placeholders manualmente para payment reminder
      const replacePaymentTemplate = (text: string): string => {
        return text
          .replace(/\{\{business_logo_url\}\}/g, businessData.logo_url || '')
          .replace(/\{\{business_primary_color\}15\}/g, 'rgba(22, 163, 74, 0.15)')
          .replace(/\{\{business_primary_color\}08\}/g, 'rgba(22, 163, 74, 0.08)')
          .replace(/\{\{business_primary_color\}20\}/g, 'rgba(22, 163, 74, 0.20)')
          .replace(/\{\{business_primary_color\}30\}/g, 'rgba(22, 163, 74, 0.30)')
          .replace(/\{\{business_primary_color\}40\}/g, 'rgba(22, 163, 74, 0.40)')
          .replace(/\{\{business_primary_color\}dd\}/g, '#16a34add')
          .replace(/\{\{business_primary_color\}d9\}/g, '#16a34ad9')
          .replace(/\{\{business_primary_color\}e6\}/g, '#16a34ae6')
          .replace(/\{\{business_primary_color\}\}/g, businessData.theme_color)
          .replace(/\{\{business_name\}\}/g, businessData.name)
          .replace(/\{\{business_whatsapp\}\}/g, businessData.phone || '')
          .replace(/\{\{business_address\}\}/g, businessData.address || '')
          .replace(/\{\{plan_name\}\}/g, user.plan_name || 'Plano')
          .replace(/\{\{price\}\}/g, `MT ${paymentAmount.toFixed(2)}`)
          .replace(/\{\{payment_link\}\}/g, `${window.location.origin}/checkout`);
      };

      // Substituir placeholders
      const subject = replacePaymentTemplate(template.subject);
      const body = replacePaymentTemplate(template.body);

      // Enviar email
      await sendEmail({
        to: user.email,
        subject: subject,
        body: body,
      });

      toast.success(`Lembrete de pagamento enviado com sucesso para ${user.email}!`, { id: loadingToast });
    } catch (error: any) {
      console.error('Erro ao enviar lembrete de pagamento:', error);
      toast.error(`Erro ao enviar lembrete: ${error.message}`);
    }
  };

  const getRoleBadge = (role: UserProfile['role']) => {
    switch (role) {
      case 'Admin':
        return <Badge className="bg-red-600 hover:bg-red-700 text-white">Admin</Badge>;
      case 'Owner':
        return <Badge variant="default">Dono Negócio</Badge>;
      case 'Client':
        return <Badge variant="secondary">Cliente</Badge>;
      default:
        return <Badge variant="outline">Outro</Badge>;
    }
  };
  
  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100/80">Pago</Badge>;
      case 'pending_payment':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80">Pendente</Badge>;
      case 'trial':
        return <Badge variant="secondary">Teste</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center text-red-600">
        <Users className="h-7 w-7 mr-3" />
        Gestão de Usuários
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Listagem de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4 space-x-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={fetchUsers}>
              <Filter className="h-4 w-4 mr-2" /> Filtrar
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum usuário encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status Pagamento</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                        {user.business_name && (
                            <div className="flex items-center text-xs text-gray-600 mt-1">
                                <Briefcase className="h-3 w-3 mr-1" /> {user.business_name}
                            </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.plan_name}</TableCell>
                      <TableCell>
                        {getSubscriptionBadge(user.subscription_status)}
                      </TableCell>
                      <TableCell>{format(new Date(user.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {user.subscription_status === 'pending_payment' && (
                            <Button variant="default" size="sm" onClick={() => handleSendPaymentReminder(user)} title="Enviar Lembrete">
                                Lembrete
                            </Button>
                        )}
                        <Button variant="outline" size="icon" title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="secondary" size="icon" onClick={() => handleToggleActive(user)} title={user.is_active ? 'Inativar' : 'Ativar'}>
                          {user.is_active ? <UserX className="h-4 w-4 text-red-600" /> : <UserCheck className="h-4 w-4 text-green-600" />}
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(user)} title="Excluir">
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

export default AdminUsersPage;