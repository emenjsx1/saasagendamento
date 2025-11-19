import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Loader2, Search, Filter, Edit, Trash2, UserCheck, UserX, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  role: 'Admin' | 'Owner' | 'Client';
  is_active: boolean; // Simulado
  business_name: string | null; // Nome do negócio associado
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    
    // 1. Buscar todos os perfis e dados de autenticação
    let profilesQuery = supabase
      .from('profiles')
      .select(`
        id, 
        first_name, 
        last_name, 
        created_at, 
        auth_users:auth.users(email, created_at)
      `);

    if (searchTerm) {
      profilesQuery = profilesQuery.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
    }

    const { data: profilesData, error: profilesError } = await profilesQuery;

    if (profilesError) {
      toast.error("Erro ao carregar perfis de usuários.");
      console.error(profilesError);
      setIsLoading(false);
      return;
    }

    // 2. Buscar administradores e donos de negócios para determinar o papel
    const { data: adminData } = await supabase.from('admin_users').select('user_id');
    const adminIds = new Set(adminData?.map(a => a.user_id) || []);
    
    const { data: businessData } = await supabase.from('businesses').select('owner_id, name');
    const businessMap = new Map(businessData?.map(b => [b.owner_id, b.name]) || []);


    // 3. Mapear e combinar
    const mappedUsers: UserProfile[] = (profilesData || []).map((p: any) => {
      const isAdministrator = adminIds.has(p.id);
      const businessName = businessMap.get(p.id) || null;
      const isOwner = !!businessName;
      
      let role: UserProfile['role'] = 'Client';
      if (isAdministrator) {
        role = 'Admin';
      } else if (isOwner) {
        role = 'Owner';
      }

      return {
        id: p.id,
        email: p.auth_users?.email || 'N/A',
        first_name: p.first_name,
        last_name: p.last_name,
        created_at: p.auth_users?.created_at || p.created_at,
        role: role,
        is_active: true, // Simulado
        business_name: businessName,
      };
    });

    setUsers(mappedUsers);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  const handleToggleActive = (user: UserProfile) => {
    // Lógica de ativação/inativação (requer acesso de serviço ou função admin)
    toast.info(`Funcionalidade de Ativar/Inativar Usuário para ${user.email} em desenvolvimento.`);
  };

  const handleDelete = (user: UserProfile) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário ${user.email}? Esta ação é irreversível.`)) {
      // Lógica de exclusão
      toast.info(`Funcionalidade de Excluir Usuário para ${user.email} em desenvolvimento.`);
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
                    <TableHead>Negócio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.business_name ? (
                            <div className="flex items-center text-xs text-gray-600">
                                <Briefcase className="h-3 w-3 mr-1" /> {user.business_name}
                            </div>
                        ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            user.is_active ? 'bg-green-100 text-green-700 hover:bg-green-100/80' : 'bg-red-100 text-red-700 hover:bg-red-100/80'
                          )}
                        >
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(user.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right space-x-2">
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