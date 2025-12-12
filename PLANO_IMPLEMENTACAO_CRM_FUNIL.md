# 📋 Plano de Implementação - CRM Básico e Funil de Vendas

**Data de Criação:** Janeiro 2025  
**Produto:** AgenCodes  
**Objetivo:** Implementar sistema completo de CRM e Funil de Vendas para planos Profissional e Negócio

---

## 🎯 Visão Geral

Este plano detalha a implementação de:
1. **CRM Básico Completo** - Gestão completa de clientes com histórico e segmentação
2. **Funil de Vendas** - Pipeline de vendas com Kanban e métricas

**Prazo Estimado:** 4-6 semanas  
**Prioridade:** Alta (diferencial competitivo)

---

## 📊 Estrutura do Plano

### FASE 1: Banco de Dados e Backend (Semana 1-2)
### FASE 2: CRM Básico - Interface (Semana 2-3)
### FASE 3: Funil de Vendas - Interface (Semana 3-4)
### FASE 4: Métricas e Relatórios (Semana 4-5)
### FASE 5: Testes e Refinamentos (Semana 5-6)

---

## 🔷 FASE 1: Banco de Dados e Backend (Semana 1-2)

### 1.1 Criar Tabelas do Banco de Dados

#### 📁 Arquivo: `supabase/migrations/create_crm_tables.sql`

**Tabelas a criar:**

1. **`clients`** - Tabela principal de clientes
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active', -- active, inactive, blocked
  tags TEXT[], -- Array de tags
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, email), -- Email único por negócio
  UNIQUE(business_id, phone)  -- Telefone único por negócio
);

CREATE INDEX idx_clients_business_id ON clients(business_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_tags ON clients USING GIN(tags);
```

2. **`client_interactions`** - Histórico de interações
```sql
CREATE TABLE client_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- appointment, call, email, message, note, payment
  title TEXT,
  description TEXT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  metadata JSONB, -- Dados adicionais flexíveis
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_client_id ON client_interactions(client_id);
CREATE INDEX idx_interactions_business_id ON client_interactions(business_id);
CREATE INDEX idx_interactions_type ON client_interactions(interaction_type);
CREATE INDEX idx_interactions_created_at ON client_interactions(created_at DESC);
```

3. **`sales_pipeline`** - Pipeline de vendas
```sql
CREATE TABLE sales_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  stage TEXT NOT NULL, -- lead, proposal, negotiation, closed, lost
  value DECIMAL(10, 2), -- Valor estimado da venda
  probability INTEGER DEFAULT 0, -- 0-100%
  expected_close_date DATE,
  assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
  tags TEXT[],
  metadata JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  closed_reason TEXT
);

CREATE INDEX idx_pipeline_business_id ON sales_pipeline(business_id);
CREATE INDEX idx_pipeline_stage ON sales_pipeline(stage);
CREATE INDEX idx_pipeline_client_id ON sales_pipeline(client_id);
CREATE INDEX idx_pipeline_assigned_to ON sales_pipeline(assigned_to);
```

4. **`client_segments`** - Segmentação de clientes
```sql
CREATE TABLE client_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL, -- Critérios de segmentação (ex: tags, status, valor total)
  color TEXT DEFAULT '#2563eb', -- Cor para visualização
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, name)
);

CREATE INDEX idx_segments_business_id ON client_segments(business_id);
```

#### **Tarefas:**
- [ ] Criar migration SQL com todas as tabelas
- [ ] Adicionar RLS (Row Level Security) policies
- [ ] Criar triggers para `updated_at`
- [ ] Criar funções auxiliares (ex: `get_client_stats`, `calculate_pipeline_value`)

**Estimativa:** 2-3 dias

---

### 1.2 Migrar Dados Existentes

#### 📁 Arquivo: `supabase/migrations/migrate_existing_clients.sql`

**Objetivo:** Extrair clientes dos agendamentos existentes

```sql
-- Função para migrar clientes de appointments para tabela clients
CREATE OR REPLACE FUNCTION migrate_clients_from_appointments()
RETURNS INTEGER AS $$
DECLARE
  client_count INTEGER := 0;
BEGIN
  INSERT INTO clients (business_id, name, email, phone, whatsapp, created_at)
  SELECT DISTINCT
    a.business_id,
    a.client_name,
    a.client_email,
    NULL, -- phone será extraído se necessário
    a.client_whatsapp,
    MIN(a.created_at) as created_at
  FROM appointments a
  WHERE a.business_id IS NOT NULL
    AND a.client_name IS NOT NULL
  GROUP BY a.business_id, a.client_name, a.client_email, a.client_whatsapp
  ON CONFLICT (business_id, COALESCE(email, '')) DO NOTHING;
  
  GET DIAGNOSTICS client_count = ROW_COUNT;
  RETURN client_count;
END;
$$ LANGUAGE plpgsql;
```

**Tarefas:**
- [ ] Criar função de migração
- [ ] Executar migração em produção
- [ ] Validar dados migrados
- [ ] Criar interações iniciais a partir de agendamentos

**Estimativa:** 1 dia

---

### 1.3 Criar Hooks e Utils

#### 📁 Arquivos a criar:

1. **`src/hooks/use-clients.ts`** - Hook para gerenciar clientes
```typescript
// Funcionalidades:
// - fetchClients (com filtros, busca, paginação)
// - createClient
// - updateClient
// - deleteClient
// - addClientTag
// - removeClientTag
// - getClientStats
```

2. **`src/hooks/use-client-interactions.ts`** - Hook para interações
```typescript
// Funcionalidades:
// - fetchInteractions (por cliente ou negócio)
// - createInteraction
// - updateInteraction
// - deleteInteraction
```

3. **`src/hooks/use-sales-pipeline.ts`** - Hook para pipeline
```typescript
// Funcionalidades:
// - fetchPipeline (por stage, business, assigned_to)
// - createDeal
// - updateDeal
// - moveDeal (mudar stage)
// - deleteDeal
// - getPipelineStats
```

4. **`src/hooks/use-client-segments.ts`** - Hook para segmentação
```typescript
// Funcionalidades:
// - fetchSegments
// - createSegment
// - updateSegment
// - deleteSegment
// - getClientsInSegment
```

5. **`src/utils/client-utils.ts`** - Utilitários
```typescript
// - formatClientName
// - calculateClientLifetimeValue
// - getClientLastInteraction
// - segmentClientsByCriteria
```

**Tarefas:**
- [ ] Criar todos os hooks
- [ ] Implementar funções CRUD
- [ ] Adicionar tratamento de erros
- [ ] Adicionar loading states
- [ ] Testar hooks isoladamente

**Estimativa:** 3-4 dias

---

## 🔷 FASE 2: CRM Básico - Interface (Semana 2-3)

### 2.1 Página Principal de Clientes

#### 📁 Arquivo: `src/pages/ClientsPage.tsx`

**Funcionalidades:**
- Lista de clientes com busca e filtros
- Cards/Grid de clientes
- Filtros por: tags, status, segmento, data
- Ordenação: nome, última interação, valor total
- Paginação
- Ações rápidas: ver detalhes, criar interação, adicionar tag

**Componentes necessários:**
- `ClientCard` ou `ClientRow`
- `ClientFilters`
- `ClientSearch`
- `ClientActionsMenu`

**Tarefas:**
- [ ] Criar estrutura da página
- [ ] Implementar lista de clientes
- [ ] Adicionar busca e filtros
- [ ] Implementar paginação
- [ ] Adicionar ações rápidas
- [ ] Responsividade mobile

**Estimativa:** 3-4 dias

---

### 2.2 Página de Detalhes do Cliente

#### 📁 Arquivo: `src/pages/ClientDetailPage.tsx`

**Funcionalidades:**
- Informações do cliente (nome, contatos, endereço)
- Histórico completo de interações (timeline)
- Lista de agendamentos
- Histórico de pagamentos
- Tags e segmentos
- Notas do cliente
- Estatísticas (valor total, número de agendamentos, última interação)
- Ações: editar, adicionar interação, criar deal, adicionar tag

**Componentes necessários:**
- `ClientInfoCard`
- `ClientInteractionsTimeline`
- `ClientAppointmentsList`
- `ClientPaymentsList`
- `ClientTags`
- `ClientNotes`
- `ClientStats`

**Tarefas:**
- [ ] Criar layout da página
- [ ] Implementar seção de informações
- [ ] Implementar timeline de interações
- [ ] Adicionar lista de agendamentos
- [ ] Adicionar histórico de pagamentos
- [ ] Implementar gestão de tags
- [ ] Adicionar estatísticas
- [ ] Responsividade

**Estimativa:** 4-5 dias

---

### 2.3 Modal/Formulário de Cliente

#### 📁 Arquivo: `src/components/ClientForm.tsx`

**Funcionalidades:**
- Criar novo cliente
- Editar cliente existente
- Validação de campos
- Upload de foto (opcional)

**Campos:**
- Nome (obrigatório)
- Email
- Telefone/WhatsApp
- Endereço
- Notas
- Tags (multiselect)
- Status

**Tarefas:**
- [ ] Criar formulário com react-hook-form
- [ ] Adicionar validação
- [ ] Integrar com hook use-clients
- [ ] Adicionar upload de foto (opcional)
- [ ] Testar criação e edição

**Estimativa:** 2 dias

---

### 2.4 Sistema de Tags

#### 📁 Arquivos:
- `src/components/ClientTags.tsx` - Componente de tags
- `src/components/TagSelector.tsx` - Seletor de tags
- `src/components/TagBadge.tsx` - Badge de tag

**Funcionalidades:**
- Visualizar tags do cliente
- Adicionar tags (com autocomplete)
- Remover tags
- Criar novas tags
- Cores personalizadas (opcional)

**Tarefas:**
- [ ] Criar componentes de tags
- [ ] Implementar autocomplete
- [ ] Adicionar cores personalizadas
- [ ] Integrar com backend

**Estimativa:** 2 dias

---

### 2.5 Sistema de Segmentação

#### 📁 Arquivo: `src/pages/ClientSegmentsPage.tsx`

**Funcionalidades:**
- Lista de segmentos criados
- Criar novo segmento
- Editar segmento
- Visualizar clientes no segmento
- Critérios de segmentação:
  - Por tags
  - Por status
  - Por valor total gasto
  - Por número de agendamentos
  - Por última interação

**Componentes:**
- `SegmentCard`
- `SegmentForm`
- `SegmentCriteriaBuilder`

**Tarefas:**
- [ ] Criar página de segmentos
- [ ] Implementar builder de critérios
- [ ] Adicionar visualização de clientes no segmento
- [ ] Testar segmentação

**Estimativa:** 3-4 dias

---

### 2.6 Modal de Interação

#### 📁 Arquivo: `src/components/InteractionModal.tsx`

**Funcionalidades:**
- Criar nova interação
- Tipos de interação:
  - Nota
  - Ligação
  - Email
  - Mensagem
  - Agendamento (linkar existente)
  - Pagamento (linkar existente)
- Data e hora
- Descrição/Notas
- Anexos (opcional, futuro)

**Tarefas:**
- [ ] Criar modal de interação
- [ ] Implementar formulário
- [ ] Adicionar tipos de interação
- [ ] Linkar com agendamentos/pagamentos
- [ ] Integrar com hook

**Estimativa:** 2-3 dias

---

## 🔷 FASE 3: Funil de Vendas - Interface (Semana 3-4)

### 3.1 Página do Pipeline (Kanban)

#### 📁 Arquivo: `src/pages/SalesPipelinePage.tsx`

**Funcionalidades:**
- Visualização Kanban (colunas por stage)
- Stages: Leads → Proposta → Negociação → Fechado
- Drag & Drop entre stages
- Cards de deals com informações resumidas
- Filtros: por cliente, responsável, valor, data
- Busca
- Criar novo deal
- Editar deal
- Visualizar detalhes do deal

**Componentes:**
- `PipelineKanban` - Componente principal
- `PipelineColumn` - Coluna do Kanban
- `DealCard` - Card do deal
- `DealModal` - Modal de criação/edição

**Bibliotecas sugeridas:**
- `@dnd-kit/core` e `@dnd-kit/sortable` para drag & drop

**Tarefas:**
- [ ] Instalar biblioteca de drag & drop
- [ ] Criar estrutura do Kanban
- [ ] Implementar colunas
- [ ] Implementar cards de deals
- [ ] Adicionar drag & drop
- [ ] Implementar atualização de stage
- [ ] Adicionar filtros e busca
- [ ] Responsividade mobile (scroll horizontal)

**Estimativa:** 5-6 dias

---

### 3.2 Modal/Formulário de Deal

#### 📁 Arquivo: `src/components/DealForm.tsx`

**Funcionalidades:**
- Criar novo deal
- Editar deal existente
- Campos:
  - Título (obrigatório)
  - Cliente (select ou criar novo)
  - Stage (select)
  - Valor estimado
  - Probabilidade (0-100%)
  - Data esperada de fechamento
  - Responsável (select de funcionários)
  - Descrição
  - Tags
- Validação

**Tarefas:**
- [ ] Criar formulário
- [ ] Adicionar validação
- [ ] Integrar com hook
- [ ] Adicionar select de clientes
- [ ] Adicionar select de funcionários

**Estimativa:** 2 dias

---

### 3.3 Página de Detalhes do Deal

#### 📁 Arquivo: `src/pages/DealDetailPage.tsx`

**Funcionalidades:**
- Informações completas do deal
- Timeline de mudanças de stage
- Notas e atividades
- Histórico de interações relacionadas
- Ações: editar, mover stage, fechar, perder

**Componentes:**
- `DealInfoCard`
- `DealTimeline`
- `DealNotes`
- `DealActions`

**Tarefas:**
- [ ] Criar página de detalhes
- [ ] Implementar timeline
- [ ] Adicionar notas
- [ ] Implementar ações

**Estimativa:** 3 dias

---

## 🔷 FASE 4: Métricas e Relatórios (Semana 4-5)

### 4.1 Dashboard de Métricas do CRM

#### 📁 Arquivo: `src/pages/CRMDashboardPage.tsx`

**Métricas a exibir:**

1. **Clientes:**
   - Total de clientes
   - Novos clientes (último mês)
   - Clientes ativos
   - Clientes por segmento

2. **Interações:**
   - Total de interações
   - Interações por tipo
   - Última interação média

3. **Pipeline:**
   - Total de deals
   - Valor total do pipeline
   - Deals por stage
   - Taxa de conversão
   - Tempo médio por stage

**Componentes:**
- `ClientMetricsCard`
- `InteractionMetricsCard`
- `PipelineMetricsCard`
- Gráficos (usar `recharts` ou similar)

**Tarefas:**
- [ ] Criar página de dashboard
- [ ] Implementar cards de métricas
- [ ] Adicionar gráficos
- [ ] Calcular métricas no backend
- [ ] Adicionar filtros de período

**Estimativa:** 4-5 dias

---

### 4.2 Relatórios do Pipeline

#### 📁 Arquivo: `src/pages/PipelineReportsPage.tsx`

**Relatórios:**
- Conversão por stage
- Tempo médio em cada stage
- Deals ganhos vs perdidos
- Valor médio por deal
- Performance por responsável
- Previsão de receita

**Tarefas:**
- [ ] Criar página de relatórios
- [ ] Implementar cálculos
- [ ] Adicionar gráficos
- [ ] Exportar para PDF/Excel (opcional)

**Estimativa:** 3-4 dias

---

## 🔷 FASE 5: Testes e Refinamentos (Semana 5-6)

### 5.1 Testes

**Tarefas:**
- [ ] Testes unitários dos hooks
- [ ] Testes de integração
- [ ] Testes E2E das principais funcionalidades
- [ ] Testes de performance
- [ ] Testes de acessibilidade

**Estimativa:** 3-4 dias

---

### 5.2 Refinamentos

**Tarefas:**
- [ ] Ajustar UI/UX baseado em feedback
- [ ] Otimizar queries do banco
- [ ] Adicionar loading states
- [ ] Melhorar mensagens de erro
- [ ] Adicionar tooltips e ajuda
- [ ] Documentação de uso

**Estimativa:** 2-3 dias

---

### 5.3 Integração com Sistema Existente

**Tarefas:**
- [ ] Linkar agendamentos com clientes automaticamente
- [ ] Linkar pagamentos com clientes automaticamente
- [ ] Criar interações automáticas quando:
  - Agendamento é criado
  - Agendamento é confirmado
  - Pagamento é recebido
- [ ] Adicionar links no menu do dashboard
- [ ] Atualizar planos de precificação (se necessário)

**Estimativa:** 2-3 dias

---

## 📊 Resumo de Estimativas

| Fase | Tarefas | Estimativa |
|------|---------|------------|
| Fase 1: Banco de Dados | 3 tarefas principais | 6-8 dias |
| Fase 2: CRM Interface | 6 tarefas principais | 12-15 dias |
| Fase 3: Funil Interface | 3 tarefas principais | 10-11 dias |
| Fase 4: Métricas | 2 tarefas principais | 7-9 dias |
| Fase 5: Testes | 3 tarefas principais | 7-10 dias |
| **TOTAL** | | **42-53 dias** (6-7.5 semanas) |

---

## 🎯 Priorização (MVP)

Se precisar entregar mais rápido, priorize:

### MVP 1 (2-3 semanas):
1. ✅ Tabelas do banco
2. ✅ Página de clientes básica
3. ✅ Página de detalhes do cliente
4. ✅ Histórico de interações básico
5. ✅ Sistema de tags básico

### MVP 2 (2 semanas adicionais):
6. ✅ Pipeline Kanban básico
7. ✅ Métricas básicas
8. ✅ Segmentação básica

### Fase 2 (futuro):
- Relatórios avançados
- Automações
- Exportação de dados
- Integrações externas

---

## 🛠️ Tecnologias e Bibliotecas

### Já usadas no projeto:
- React + TypeScript
- Supabase (banco de dados)
- Tailwind CSS
- React Hook Form
- Zod (validação)

### Novas bibliotecas sugeridas:
- `@dnd-kit/core` e `@dnd-kit/sortable` - Drag & Drop para Kanban
- `recharts` ou `chart.js` - Gráficos e métricas
- `date-fns` - Já usado, continuar usando
- `react-select` - Selects avançados (tags, clientes)

---

## 📝 Checklist de Implementação

### Preparação
- [ ] Revisar plano com equipe
- [ ] Definir prioridades
- [ ] Configurar ambiente de desenvolvimento
- [ ] Instalar bibliotecas necessárias

### Desenvolvimento
- [ ] Fase 1: Banco de dados
- [ ] Fase 2: CRM Interface
- [ ] Fase 3: Funil Interface
- [ ] Fase 4: Métricas
- [ ] Fase 5: Testes

### Deploy
- [ ] Executar migrations em produção
- [ ] Migrar dados existentes
- [ ] Testar em produção
- [ ] Documentar para usuários
- [ ] Treinar equipe de suporte

---

## 🚀 Próximos Passos

1. **Revisar este plano** e ajustar conforme necessário
2. **Priorizar features** do MVP
3. **Criar issues/tarefas** no sistema de gestão
4. **Começar pela Fase 1** (banco de dados)
5. **Iterar e ajustar** conforme feedback

---

**Última atualização:** Janeiro 2025  
**Versão:** 1.0


