import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Users, Mail, Search, CheckCircle2, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEmailNotifications } from '@/hooks/use-email-notifications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  subscription_status: string;
  is_selected: boolean;
}

const PRE_MADE_MESSAGES = [
  {
    id: 'welcome',
    subject: 'Bem-vindo ao AgenCode!',
    body: 'Olá {{name}},\n\nBem-vindo ao AgenCode! Estamos felizes em tê-lo conosco.\n\nAproveite nossos serviços e recursos.\n\nAtenciosamente,\nEquipe AgenCode',
  },
  {
    id: 'payment_reminder',
    subject: 'Lembrete de Pagamento Pendente',
    body: 'Olá {{name}},\n\nIdentificamos que você tem um pagamento pendente.\n\nPor favor, complete seu pagamento para continuar usando nossos serviços.\n\nAtenciosamente,\nEquipe AgenCode',
  },
  {
    id: 'trial_expiring',
    subject: 'Seu Período de Teste Está Expirando',
    body: 'Olá {{name}},\n\nSeu período de teste gratuito está expirando em breve.\n\nRenove sua assinatura para continuar aproveitando todos os recursos.\n\nAtenciosamente,\nEquipe AgenCode',
  },
  {
    id: 'promotion',
    subject: 'Promoção Especial - AgenCode',
    body: 'Olá {{name}},\n\nTemos uma promoção especial para você!\n\nAproveite descontos exclusivos em nossos planos.\n\nAtenciosamente,\nEquipe AgenCode',
  },
];

const CommunicationCenter: React.FC = () => {
  const { T } = useCurrency();
  const { sendEmail } = useEmailNotifications();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'trial'>('all');
  
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterStatus]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Buscar todos os perfis
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar status de assinatura
      const { data: subscriptionsData } = await supabase
        .from('subscriptions')
        .select('user_id, status, is_trial')
        .order('created_at', { ascending: false });

      const subscriptionMap = new Map();
      (subscriptionsData || []).forEach((sub: any) => {
        if (!subscriptionMap.has(sub.user_id)) {
          subscriptionMap.set(sub.user_id, sub.is_trial ? 'trial' : sub.status);
        }
      });

      const usersList: User[] = (profilesData || [])
        .filter((p: any) => p.email) // Apenas usuários com email
        .map((p: any) => ({
          id: p.id,
          email: p.email,
          first_name: p.first_name,
          last_name: p.last_name,
          subscription_status: subscriptionMap.get(p.id) || 'pending',
          is_selected: false,
        }));

      setUsers(usersList);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      toast.error(T('Erro ao carregar usuários.', 'Error loading users.'));
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Filtrar por status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(u => u.subscription_status === filterStatus);
    }

    // Filtrar por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(term) ||
        (u.first_name && u.first_name.toLowerCase().includes(term)) ||
        (u.last_name && u.last_name.toLowerCase().includes(term))
      );
    }

    setFilteredUsers(filtered);
  };

  const toggleUserSelection = (userId: string) => {
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, is_selected: !u.is_selected } : u
    ));
  };

  const selectAll = () => {
    setUsers(prev => prev.map(u => ({ ...u, is_selected: true })));
  };

  const deselectAll = () => {
    setUsers(prev => prev.map(u => ({ ...u, is_selected: false })));
  };

  const selectByStatus = (status: string) => {
    setUsers(prev => prev.map(u => 
      u.subscription_status === status ? { ...u, is_selected: true } : u
    ));
  };

  const handlePreMadeMessage = (messageId: string) => {
    const message = PRE_MADE_MESSAGES.find(m => m.id === messageId);
    if (message) {
      setEmailSubject(message.subject);
      setEmailBody(message.body);
      setSelectedMessageId(messageId);
    }
  };

  const handleSendBulkEmail = async () => {
    const selectedUsers = users.filter(u => u.is_selected);
    
    if (selectedUsers.length === 0) {
      toast.error(T('Selecione pelo menos um usuário.', 'Select at least one user.'));
      return;
    }

    if (!emailSubject || !emailBody) {
      toast.error(T('Preencha o assunto e o corpo do email.', 'Fill in the subject and body of the email.'));
      return;
    }

    setIsSending(true);
    const loadingToastId = toast.loading(T(`Enviando para ${selectedUsers.length} usuários...`, `Sending to ${selectedUsers.length} users...`));

    let successCount = 0;
    let errorCount = 0;

    for (const user of selectedUsers) {
      try {
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuário';
        let body = emailBody.replace(/\{\{name\}\}/g, name);
        body = body.replace(/\{\{email\}\}/g, user.email);

        await sendEmail({
          to: user.email,
          subject: emailSubject,
          body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
            <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0;">AgenCode</h1>
              </div>
              <div style="color: #333; line-height: 1.6; white-space: pre-wrap;">${body.replace(/\n/g, '<br>')}</div>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">FEITO POR AgenCode</p>
                <p style="margin: 5px 0 0 0;">Este é um email automático, por favor não responda.</p>
              </div>
            </div>
          </div>`,
        });
        successCount++;
      } catch (error) {
        console.error(`Erro ao enviar para ${user.email}:`, error);
        errorCount++;
      }
    }

    setIsSending(false);
    
    if (errorCount === 0) {
      toast.success(T(`Emails enviados com sucesso para ${successCount} usuários!`, `Emails sent successfully to ${successCount} users!`), { id: loadingToastId });
    } else {
      toast.warning(T(`Enviados: ${successCount}. Erros: ${errorCount}`, `Sent: ${successCount}. Errors: ${errorCount}`), { id: loadingToastId });
    }

    // Desmarcar todos após envio
    deselectAll();
  };

  const selectedCount = users.filter(u => u.is_selected).length;
  const stats = {
    all: users.length,
    active: users.filter(u => u.subscription_status === 'active').length,
    pending: users.filter(u => u.subscription_status === 'pending_payment' || u.subscription_status === 'pending').length,
    trial: users.filter(u => u.subscription_status === 'trial').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300"><Clock className="h-3 w-3 mr-1" /> Teste</Badge>;
      case 'pending_payment':
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><AlertCircle className="h-3 w-3 mr-1" /> Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{stats.all}</div>
            <p className="text-xs text-gray-600 mt-1">Total de Usuários</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-gray-600 mt-1">Ativos</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-gray-600 mt-1">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.trial}</div>
            <p className="text-xs text-gray-600 mt-1">Teste Grátis</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Seleção */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {T('Lista de Usuários', 'User List')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={T("Buscar por nome ou email...", "Search by name or email...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{T('Todos', 'All')}</SelectItem>
                <SelectItem value="active">{T('Ativos', 'Active')}</SelectItem>
                <SelectItem value="pending">{T('Pendentes', 'Pending')}</SelectItem>
                <SelectItem value="trial">{T('Teste', 'Trial')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              {T('Selecionar Todos', 'Select All')}
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              {T('Desmarcar Todos', 'Deselect All')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => selectByStatus('active')}>
              {T('Selecionar Ativos', 'Select Active')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => selectByStatus('pending')}>
              {T('Selecionar Pendentes', 'Select Pending')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => selectByStatus('trial')}>
              {T('Selecionar Teste', 'Select Trial')}
            </Button>
          </div>

          {selectedCount > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-700">
                {T(`${selectedCount} usuário(s) selecionado(s)`, `${selectedCount} user(s) selected`)}
              </p>
            </div>
          )}

          {/* Lista de Usuários */}
          <div className="max-h-[400px] overflow-y-auto border rounded-lg">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {T('Nenhum usuário encontrado.', 'No users found.')}
              </div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="p-3 hover:bg-gray-50 flex items-center gap-3">
                    <Checkbox
                      checked={user.is_selected}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                    </div>
                    {getStatusBadge(user.subscription_status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Área de Composição de Email */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {T('Compor Mensagem', 'Compose Message')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mensagens Pré-prontas */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {T('Mensagens Pré-prontas', 'Pre-made Messages')}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PRE_MADE_MESSAGES.map((msg) => (
                <Button
                  key={msg.id}
                  variant={selectedMessageId === msg.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePreMadeMessage(msg.id)}
                  className="text-xs"
                >
                  {msg.subject}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {T('Assunto', 'Subject')} *
            </label>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder={T("Assunto do email", "Email subject")}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {T('Mensagem', 'Message')} *
            </label>
            <Textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={8}
              placeholder={T("Digite sua mensagem. Use {{name}} para nome do usuário e {{email}} para email.", "Type your message. Use {{name}} for user name and {{email}} for email.")}
            />
            <p className="text-xs text-gray-500 mt-1">
              {T('Placeholders disponíveis: {{name}}, {{email}}', 'Available placeholders: {{name}}, {{email}}')}
            </p>
          </div>

          <Button
            onClick={handleSendBulkEmail}
            disabled={isSending || selectedCount === 0}
            className="w-full"
            size="lg"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {T('Enviando...', 'Sending...')}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {T(`Enviar para ${selectedCount} usuário(s)`, `Send to ${selectedCount} user(s)`)}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommunicationCenter;


