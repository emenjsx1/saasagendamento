# 🚀 Próximos Passos - Implementação CRM e Funil de Vendas

## ✅ Passo 1: Migration Executada
As tabelas foram criadas com sucesso! Agora vamos para os próximos passos.

---

## 📋 Passo 2: Migrar Dados Existentes

### 2.0 Corrigir Função de Migração (IMPORTANTE!)

**Primeiro**, execute este arquivo SQL no Supabase SQL Editor:
- `supabase/migrations/20250115_fix_migrate_clients_function.sql`

Isso corrige a função de migração para não usar `ON CONFLICT` (que não funciona com índices parciais).

### 2.1 Executar Função de Migração

Depois de corrigir a função, no Supabase SQL Editor, execute:

```sql
-- Migrar clientes existentes dos appointments
SELECT migrate_clients_from_appointments();
```

Isso vai retornar o número de clientes migrados.

Isso vai:
- Extrair clientes únicos da tabela `appointments`
- Criar registros na tabela `clients`
- Manter a relação com o negócio

### 2.2 Criar Interações Iniciais

Depois de migrar os clientes, vamos criar interações a partir dos agendamentos existentes:

```sql
-- Criar interações a partir de agendamentos existentes
INSERT INTO client_interactions (
  client_id,
  business_id,
  interaction_type,
  title,
  description,
  appointment_id,
  created_at
)
SELECT 
  c.id as client_id,
  a.business_id,
  'appointment' as interaction_type,
  CASE 
    WHEN a.status = 'confirmed' THEN 'Agendamento Confirmado'
    WHEN a.status = 'completed' THEN 'Atendimento Concluído'
    WHEN a.status = 'pending' THEN 'Agendamento Pendente'
    ELSE 'Agendamento'
  END as title,
  'Agendamento de ' || a.services->>'name' as description,
  a.id as appointment_id,
  a.created_at
FROM appointments a
INNER JOIN clients c ON 
  c.business_id = a.business_id 
  AND c.name = a.client_name
  AND (c.email = a.client_email OR (c.email IS NULL AND a.client_email IS NULL))
WHERE a.business_id IS NOT NULL
  AND a.client_name IS NOT NULL;
```

### 2.3 Criar Interações a partir de Pagamentos

```sql
-- Criar interações a partir de pagamentos
INSERT INTO client_interactions (
  client_id,
  business_id,
  interaction_type,
  title,
  description,
  payment_id,
  created_at
)
SELECT 
  c.id as client_id,
  p.user_id as business_id, -- Ajustar conforme sua estrutura
  'payment' as interaction_type,
  'Pagamento Recebido' as title,
  'Pagamento de ' || p.amount || ' ' || COALESCE(p.currency, 'MZN') as description,
  p.id as payment_id,
  p.payment_date as created_at
FROM payments p
INNER JOIN clients c ON 
  c.business_id = p.user_id -- Ajustar conforme sua estrutura
  AND c.phone = p.phone -- Ajustar conforme sua estrutura de payments
WHERE p.status = 'confirmed'
  AND p.payment_type = 'subscription';
```

**⚠️ Nota:** Ajuste os campos conforme a estrutura real da sua tabela `payments`.

---

## 📋 Passo 3: Criar Hooks TypeScript

Vamos criar os hooks para gerenciar os dados do CRM.

### 3.1 Hook de Clientes

Criar arquivo: `src/hooks/use-clients.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Client {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | 'blocked';
  tags: string[];
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UseClientsOptions {
  businessId?: string;
  search?: string;
  tags?: string[];
  status?: string;
  limit?: number;
  offset?: number;
}

export function useClients(options: UseClientsOptions = {}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!options.businessId) {
      setIsLoading(false);
      return;
    }

    const fetchClients = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let query = supabase
          .from('clients')
          .select('*', { count: 'exact' })
          .eq('business_id', options.businessId);

        // Aplicar filtros
        if (options.search) {
          query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%,phone.ilike.%${options.search}%`);
        }

        if (options.status) {
          query = query.eq('status', options.status);
        }

        if (options.tags && options.tags.length > 0) {
          query = query.contains('tags', options.tags);
        }

        // Ordenação
        query = query.order('created_at', { ascending: false });

        // Paginação
        if (options.limit) {
          query = query.limit(options.limit);
        }
        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        const { data, error: queryError, count } = await query;

        if (queryError) throw queryError;

        setClients(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching clients:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [options.businessId, options.search, options.status, options.tags, options.limit, options.offset]);

  const createClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  const addTag = async (id: string, tag: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) throw new Error('Client not found');

    const newTags = [...(client.tags || []), tag];
    return updateClient(id, { tags: newTags });
  };

  const removeTag = async (id: string, tag: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) throw new Error('Client not found');

    const newTags = (client.tags || []).filter(t => t !== tag);
    return updateClient(id, { tags: newTags });
  };

  return {
    clients,
    isLoading,
    error,
    totalCount,
    createClient,
    updateClient,
    deleteClient,
    addTag,
    removeTag,
    refetch: () => {
      // Trigger re-fetch by updating a dependency
      setClients([]);
    }
  };
}
```

### 3.2 Hook de Interações

Criar arquivo: `src/hooks/use-client-interactions.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClientInteraction {
  id: string;
  client_id: string;
  business_id: string;
  interaction_type: 'appointment' | 'call' | 'email' | 'message' | 'note' | 'payment' | 'meeting' | 'other';
  title: string | null;
  description: string | null;
  appointment_id: string | null;
  payment_id: string | null;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UseClientInteractionsOptions {
  clientId?: string;
  businessId?: string;
  interactionType?: string;
  limit?: number;
}

export function useClientInteractions(options: UseClientInteractionsOptions = {}) {
  const [interactions, setInteractions] = useState<ClientInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchInteractions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let query = supabase
          .from('client_interactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (options.clientId) {
          query = query.eq('client_id', options.clientId);
        }

        if (options.businessId) {
          query = query.eq('business_id', options.businessId);
        }

        if (options.interactionType) {
          query = query.eq('interaction_type', options.interactionType);
        }

        if (options.limit) {
          query = query.limit(options.limit);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;

        setInteractions(data || []);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching interactions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInteractions();
  }, [options.clientId, options.businessId, options.interactionType, options.limit]);

  const createInteraction = async (interactionData: Omit<ClientInteraction, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('client_interactions')
      .insert(interactionData)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  return {
    interactions,
    isLoading,
    error,
    createInteraction,
  };
}
```

### 3.3 Hook de Pipeline

Criar arquivo: `src/hooks/use-sales-pipeline.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SalesDeal {
  id: string;
  business_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  stage: 'lead' | 'proposal' | 'negotiation' | 'closed' | 'lost';
  value: number;
  probability: number;
  expected_close_date: string | null;
  assigned_to: string | null;
  tags: string[];
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_reason: string | null;
}

interface UseSalesPipelineOptions {
  businessId?: string;
  stage?: string;
  assignedTo?: string;
}

export function useSalesPipeline(options: UseSalesPipelineOptions = {}) {
  const [deals, setDeals] = useState<SalesDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!options.businessId) {
      setIsLoading(false);
      return;
    }

    const fetchPipeline = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let query = supabase
          .from('sales_pipeline')
          .select('*')
          .eq('business_id', options.businessId)
          .order('created_at', { ascending: false });

        if (options.stage) {
          query = query.eq('stage', options.stage);
        }

        if (options.assignedTo) {
          query = query.eq('assigned_to', options.assignedTo);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;

        setDeals(data || []);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching pipeline:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPipeline();
  }, [options.businessId, options.stage, options.assignedTo]);

  const createDeal = async (dealData: Omit<SalesDeal, 'id' | 'created_at' | 'updated_at' | 'closed_at' | 'closed_reason'>) => {
    const { data, error } = await supabase
      .from('sales_pipeline')
      .insert(dealData)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updateDeal = async (id: string, updates: Partial<SalesDeal>) => {
    const { data, error } = await supabase
      .from('sales_pipeline')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const moveDeal = async (id: string, newStage: SalesDeal['stage']) => {
    const updates: Partial<SalesDeal> = { stage: newStage };
    
    if (newStage === 'closed' || newStage === 'lost') {
      updates.closed_at = new Date().toISOString();
    }

    return updateDeal(id, updates);
  };

  const deleteDeal = async (id: string) => {
    const { error } = await supabase
      .from('sales_pipeline')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  return {
    deals,
    isLoading,
    error,
    createDeal,
    updateDeal,
    moveDeal,
    deleteDeal,
  };
}
```

---

## 📋 Passo 4: Criar Página Básica de Clientes

Criar arquivo: `src/pages/ClientsPage.tsx` (versão básica)

```typescript
import React, { useState } from 'react';
import { useClients } from '@/hooks/use-clients';
import { useBusiness } from '@/hooks/use-business';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Search } from 'lucide-react';

export default function ClientsPage() {
  const { businessId } = useBusiness();
  const [search, setSearch] = useState('');
  
  const { clients, isLoading, error } = useClients({
    businessId: businessId || undefined,
    search: search || undefined,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">Erro ao carregar clientes: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar clientes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhum cliente encontrado
            </p>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="p-4 border rounded-lg hover:bg-gray-50"
                >
                  <h3 className="font-semibold">{client.name}</h3>
                  {client.email && <p className="text-sm text-gray-600">{client.email}</p>}
                  {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 📋 Passo 5: Adicionar Rota no App

Adicionar no `src/App.tsx`:

```typescript
import ClientsPage from './pages/ClientsPage';

// Dentro das rotas protegidas:
<Route path="/dashboard/clients" element={<ClientsPage />} />
```

---

## ✅ Checklist dos Próximos Passos

- [ ] **Passo 2.1:** Executar função de migração de clientes
- [ ] **Passo 2.2:** Criar interações a partir de agendamentos
- [ ] **Passo 2.3:** Criar interações a partir de pagamentos (ajustar conforme estrutura)
- [ ] **Passo 3.1:** Criar hook `use-clients.ts`
- [ ] **Passo 3.2:** Criar hook `use-client-interactions.ts`
- [ ] **Passo 3.3:** Criar hook `use-sales-pipeline.ts`
- [ ] **Passo 4:** Criar página básica de clientes
- [ ] **Passo 5:** Adicionar rota no App.tsx
- [ ] **Testar:** Verificar se a página de clientes carrega corretamente

---

## 🎯 Ordem Recomendada

1. **Primeiro:** Executar migração de dados (Passo 2)
2. **Segundo:** Criar hooks (Passo 3)
3. **Terceiro:** Criar página básica (Passo 4)
4. **Quarto:** Adicionar rota e testar (Passo 5)

---

**Próximo passo imediato:** Execute a função de migração no SQL Editor do Supabase!

