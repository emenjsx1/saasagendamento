import React, { useState } from 'react';
import { useClients } from '@/hooks/use-clients';
import { useBusiness } from '@/hooks/use-business';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, User, Mail, Phone, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrency } from '@/contexts/CurrencyContext';

export default function ClientsPage() {
  const { businessId } = useBusiness();
  const { T } = useCurrency();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { clients, isLoading, error, totalCount } = useClients({
    businessId: businessId || undefined,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600">
              {T('Erro ao carregar clientes:', 'Error loading clients:')} {error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{T('Clientes', 'Clients')}</h1>
          <p className="text-gray-500 mt-1">
            {totalCount} {T('cliente(s) cadastrado(s)', 'client(s) registered')}
          </p>
        </div>
        <Button asChild className="rounded-2xl">
          <Link to="/dashboard/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            {T('Novo Cliente', 'New Client')}
          </Link>
        </Button>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle>{T('Buscar e Filtrar', 'Search and Filter')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={T('Buscar por nome, email ou telefone...', 'Search by name, email or phone...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-2xl"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className="rounded-2xl"
              >
                {T('Todos', 'All')}
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
                className="rounded-2xl"
              >
                {T('Ativos', 'Active')}
              </Button>
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('inactive')}
                className="rounded-2xl"
              >
                {T('Inativos', 'Inactive')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <Card>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <div className="p-12 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">
                {T('Nenhum cliente encontrado', 'No clients found')}
              </p>
              <p className="text-gray-400 text-sm mb-6">
                {search 
                  ? T('Tente ajustar os filtros de busca', 'Try adjusting search filters')
                  : T('Comece adicionando seu primeiro cliente', 'Start by adding your first client')
                }
              </p>
              {!search && (
                <Button asChild className="rounded-2xl">
                  <Link to="/dashboard/clients/new">
                    <Plus className="h-4 w-4 mr-2" />
                    {T('Adicionar Primeiro Cliente', 'Add First Client')}
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  to={`/dashboard/clients/${client.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg truncate">{client.name}</h3>
                        <Badge 
                          variant={
                            client.status === 'active' ? 'default' :
                            client.status === 'inactive' ? 'secondary' : 'destructive'
                          }
                          className="rounded-full"
                        >
                          {client.status === 'active' ? T('Ativo', 'Active') :
                           client.status === 'inactive' ? T('Inativo', 'Inactive') :
                           T('Bloqueado', 'Blocked')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        {(client.phone || client.whatsapp) && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{client.whatsapp || client.phone}</span>
                          </div>
                        )}
                        {client.tags && client.tags.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            <Tag className="h-4 w-4" />
                            {client.tags.slice(0, 3).map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="rounded-full text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {client.tags.length > 3 && (
                              <span className="text-xs text-gray-400">
                                +{client.tags.length - 3} {T('mais', 'more')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right text-sm text-gray-500">
                      <p className="text-xs">
                        {new Date(client.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


