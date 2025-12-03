import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Loader2, Search, Filter, Edit, Trash2, UserCheck, UserX, Briefcase, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays, isAfter, isBefore } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEmailNotifications } from '@/hooks/use-email-notifications';
import { useAdminSettings } from '@/hooks/use-admin-settings';
import { replaceEmailTemplate } from '@/utils/email-template-replacer';
import { useCurrency } from '@/contexts/CurrencyContext';
import AdminUserDetailsDialog from '@/components/admin/AdminUserDetailsDialog';

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
  trial_ends_at: string | null;
}

const AdminUsersPage: React.FC = () => {
  const { T } = useCurrency();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const { sendEmail } = useEmailNotifications();
  const { settings } = useAdminSettings();

  const fetchUsers = async () => {
    setIsLoading(true);
    
    try {
      // 1. Buscar todos os perfis
      let profilesQuery = supabase
        .from('profiles')
        .select('id, email, first_name, last_name, created_at, is_blocked');

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
      
      // 3. Buscar subscriptions separadamente (incluindo trial_ends_at)
      const userIds = profilesData.map(p => p.id);
      const { data: subscriptionsData } = await supabase
        .from('subscriptions')
        .select('user_id, status, plan_name, trial_ends_at')
        .in('user_id', userIds);
      
      const subscriptionsMap = new Map(
        (subscriptionsData || []).map(s => [s.user_id, { 
          status: s.status, 
          plan_name: s.plan_name,
          trial_ends_at: s.trial_ends_at 
        }])
      );
      
      // 4. Mapear e combinar
      const mappedUsers: UserProfile[] = profilesData.map((p: any) => {
        const isAdministrator = adminIds.has(p.id);
        const businessName = businessMap.get(p.id) || null;
        const isOwner = !!businessName;
        
        const subscription = subscriptionsMap.get(p.id);
        const subStatus = subscription?.status || 'N/A';
        const planName = subscription?.plan_name || 'N/A';
        const trialEndsAt = subscription?.trial_ends_at || null;
        
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
          is_active: !p.is_blocked, // is_active é o inverso de is_blocked
          business_name: businessName,
          subscription_status: subStatus,
          plan_name: planName,
          trial_ends_at: trialEndsAt,
        };
      });

      // Ordenar por data de registro (mais antigos primeiro)
      mappedUsers.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateA - dateB; // Ordem crescente (mais antigos primeiro)
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

  const handleToggleActive = async (user: UserProfile) => {
    const newStatus = !user.is_active;
    const action = newStatus ? T('desbloquear', 'unblock') : T('bloquear', 'block');
    
    if (!window.confirm(
      T(
        `Tem certeza que deseja ${action} o usuário ${user.email}?`,
        `Are you sure you want to ${action} user ${user.email}?`
      )
    )) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: !newStatus })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(
        T(
          `Usuário ${newStatus ? 'desbloqueado' : 'bloqueado'} com sucesso!`,
          `User ${newStatus ? 'unblocked' : 'blocked'} successfully!`
        )
      );
      
      // Atualizar lista
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao alterar status do usuário:', error);
      toast.error(
        T(
          `Erro ao ${action} usuário: ${error.message}`,
          `Error ${action}ing user: ${error.message}`
        )
      );
    }
  };

  const handleEditClick = (userId: string) => {
    setEditingUserId(userId);
  };

  const handleDelete = async (user: UserProfile) => {
    if (!window.confirm(
      T(
        `Tem certeza que deseja excluir o usuário ${user.email}? Esta ação é irreversível e deletará todos os dados associados (negócios, agendamentos, etc.).`,
        `Are you sure you want to delete user ${user.email}? This action is irreversible and will delete all associated data (businesses, appointments, etc.).`
      )
    )) {
      return;
    }

    try {
      // Deletar usuário do Supabase Auth (isso também deleta o perfil devido ao CASCADE)
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

      if (authError) {
        // Se não tiver permissão de admin, tentar deletar apenas o perfil
        console.warn('Não foi possível deletar do auth (pode precisar de permissões de admin). Tentando deletar perfil...', authError);
        
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      toast.success(
        T(
          `Usuário ${user.email} excluído com sucesso!`,
          `User ${user.email} deleted successfully!`
        )
      );
      
      // Atualizar lista
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast.error(
        T(
          `Erro ao excluir usuário: ${error.message}`,
          `Error deleting user: ${error.message}`
        )
      );
    }
  };
  
  // Calcular dias restantes do trial
  const getTrialDaysRemaining = (user: UserProfile): number | null => {
    if (!user.trial_ends_at || user.subscription_status !== 'trial') {
      return null;
    }
    
    try {
      const trialEndDate = parseISO(user.trial_ends_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      trialEndDate.setHours(0, 0, 0, 0);
      
      const daysRemaining = differenceInDays(trialEndDate, today);
      return daysRemaining >= 0 ? daysRemaining : null; // Retorna null se já expirou
    } catch {
      return null;
    }
  };

  // Verificar se trial expirou
  const isTrialExpired = (user: UserProfile): boolean => {
    if (!user.trial_ends_at || user.subscription_status !== 'trial') {
      return false;
    }
    
    try {
      const trialEndDate = parseISO(user.trial_ends_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      trialEndDate.setHours(0, 0, 0, 0);
      
      return isBefore(trialEndDate, today) || isAfter(today, trialEndDate);
    } catch {
      return false;
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

  const handleSendTrialExpirationEmail = async (user: UserProfile) => {
    if (user.subscription_status !== 'trial') {
      toast.warning(`O usuário ${user.email} não está em período de teste.`);
      return;
    }

    const daysRemaining = getTrialDaysRemaining(user);
    const expired = isTrialExpired(user);

    if (!expired && daysRemaining !== null && daysRemaining > 0) {
      toast.warning(`O teste do usuário ${user.email} ainda não expirou. Restam ${daysRemaining} dias.`);
      return;
    }

    try {
      const loadingToast = toast.loading(`Enviando email de expiração de teste para ${user.email}...`);
      
      // Buscar template de email (usar template padrão ou customizado)
      let template = settings?.email_templates?.trial_expiration;
      
      // Se teste expirou, ajustar mensagem
      if (expired) {
        template = {
          subject: "⏰ Seu Teste Gratuito Expirou!",
          body: template?.body || `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Teste Expirado</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${userName}</strong>,</p>
      <p>Seu período de <strong>teste gratuito</strong> expirou.</p>
      <p>Para continuar usando todos os recursos da plataforma, escolha um plano agora:</p>
      <div style="text-align: center;">
        <a href="{{upgrade_link}}" class="button">Escolher Plano</a>
      </div>
    </div>
    <div class="footer">
      <p>FEITO POR AgenCode</p>
      <p>Este é um email automático, por favor não responda.</p>
    </div>
  </div>
</body>
</html>`
        };
      } else {
        template = template || {
          subject: "⏰ Seu Teste Gratuito Expira em Breve!",
          body: "<h1>Aviso</h1><p>Olá, seu período de teste está expirando. Escolha um plano para continuar.</p><p><a href='{{upgrade_link}}'>Escolher Plano</a></p>"
        };
      }

      // Preparar dados para o template
      const businessData = {
        logo_url: '',
        theme_color: '#16a34a',
        name: 'AgenCode',
        phone: '',
        address: '',
      };

      const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Cliente';
      const checkoutLink = `${window.location.origin}/checkout`;

      // Substituir placeholders
      const replaceTrialTemplate = (text: string): string => {
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
          .replace(/\{\{days_left\}\}/g, expired ? '0' : (daysRemaining?.toString() || '0'))
          .replace(/\{\{upgrade_link\}\}/g, checkoutLink)
          .replace(/\{\{payment_link\}\}/g, checkoutLink);
      };

      const subject = replaceTrialTemplate(template.subject);
      const body = replaceTrialTemplate(template.body);

      // Enviar email
      await sendEmail({
        to: user.email,
        subject: subject,
        body: body,
      });

      toast.success(`Email de expiração de teste enviado com sucesso para ${user.email}!`, { id: loadingToast });
    } catch (error: any) {
      console.error('Erro ao enviar email de expiração de teste:', error);
      toast.error(`Erro ao enviar email: ${error.message}`);
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
          <CardTitle>{T('Listagem de Usuários', 'User List')} ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4 space-x-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={T("Buscar por nome ou email...", "Search by name or email...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={fetchUsers}>
              <Filter className="h-4 w-4 mr-2" /> {T('Atualizar', 'Refresh')}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">{T('Nenhum usuário encontrado.', 'No users found.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{T('Nome', 'Name')}</TableHead>
                    <TableHead>{T('Email', 'Email')}</TableHead>
                    <TableHead>{T('Tipo', 'Type')}</TableHead>
                    <TableHead>{T('Plano', 'Plan')}</TableHead>
                    <TableHead>{T('Status Pagamento', 'Payment Status')}</TableHead>
                    <TableHead>{T('Cadastro', 'Registered')}</TableHead>
                    <TableHead className="text-right">{T('Ações', 'Actions')}</TableHead>
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
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => handleSendPaymentReminder(user)} 
                              title={T('Enviar Lembrete de Pagamento', 'Send Payment Reminder')}
                            >
                                {T('Lembrete', 'Reminder')}
                            </Button>
                        )}
                        {user.subscription_status === 'trial' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleSendTrialExpirationEmail(user)}
                              title={
                                isTrialExpired(user) 
                                  ? T('Enviar Email: Teste Expirado', 'Send Email: Trial Expired')
                                  : getTrialDaysRemaining(user) !== null
                                    ? T(`Enviar Email: ${getTrialDaysRemaining(user)} dias restantes`, `Send Email: ${getTrialDaysRemaining(user)} days remaining`)
                                    : T('Enviar Email de Expiração', 'Send Expiration Email')
                              }
                            >
                                {isTrialExpired(user) 
                                  ? T('Teste Expirado', 'Trial Expired')
                                  : getTrialDaysRemaining(user) !== null
                                    ? `${getTrialDaysRemaining(user)}d`
                                    : T('Teste', 'Trial')
                                }
                            </Button>
                        )}
                        <Button variant="outline" size="icon" title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="secondary" size="icon" onClick={() => handleToggleActive(user)} title={user.is_active ? T('Bloquear', 'Block') : T('Desbloquear', 'Unblock')}>
                          {user.is_active ? <UserX className="h-4 w-4 text-red-600" /> : <UserCheck className="h-4 w-4 text-green-600" />}
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(user)} title={T('Excluir', 'Delete')}>
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

      {/* Dialog de Detalhes/Edição do Usuário */}
      {editingUserId && (
        <AdminUserDetailsDialog
          open={!!editingUserId}
          onOpenChange={(open) => {
            if (!open) setEditingUserId(null);
          }}
          userId={editingUserId}
        />
      )}
    </div>
  );
};

export default AdminUsersPage;