# 🎫 Como Criar a Tabela de Tickets

## ⚠️ Problema
Se você está recebendo o erro `404 (Not Found)` ou `PGRST205: Could not find the table 'public.tickets'`, significa que a tabela de tickets não foi criada no banco de dados.

## ✅ Solução: Executar a Migration

### Passo 1: Acessar o Supabase Dashboard
1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**

### Passo 2: Executar a Migration
1. Copie todo o conteúdo do arquivo: `supabase/migrations/create_tickets_tables.sql`
2. Cole no SQL Editor do Supabase
3. Clique em **Run** (ou pressione `Ctrl+Enter`)

### Passo 3: Verificar se Funcionou
Execute esta query para verificar se as tabelas foram criadas:

```sql
-- Verificar se a tabela tickets existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('tickets', 'ticket_messages');
```

Você deve ver duas linhas:
- `tickets`
- `ticket_messages`

### Passo 4: Verificar Estrutura
Execute esta query para ver a estrutura da tabela:

```sql
-- Ver estrutura da tabela tickets
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tickets'
ORDER BY ordinal_position;
```

## 📋 O que a Migration Cria

A migration `create_tickets_tables.sql` cria:

1. **Tabela `tickets`**:
   - `id` (UUID, Primary Key)
   - `user_id` (UUID, Foreign Key para profiles)
   - `subject` (TEXT)
   - `description` (TEXT)
   - `status` (TEXT: 'open', 'in_progress', 'resolved', 'closed')
   - `priority` (TEXT: 'low', 'medium', 'high')
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

2. **Tabela `ticket_messages`**:
   - `id` (UUID, Primary Key)
   - `ticket_id` (UUID, Foreign Key para tickets)
   - `sender_id` (UUID, Foreign Key para profiles)
   - `sender_type` (TEXT: 'user', 'admin')
   - `message` (TEXT)
   - `created_at` (TIMESTAMPTZ)

3. **Índices** para melhor performance
4. **Trigger** para atualizar `updated_at` automaticamente
5. **RLS desabilitado** (para facilitar acesso admin)

## 🔍 Após Executar

Após executar a migration com sucesso:
- ✅ A página de criar tickets funcionará
- ✅ A página de listar tickets funcionará
- ✅ A página de detalhes do ticket funcionará
- ✅ A página admin de tickets funcionará

## ⚠️ Nota Importante

Se você receber algum erro ao executar a migration:
- Verifique se você tem permissões de superuser
- Verifique se as tabelas `profiles` existem (são referenciadas como Foreign Keys)
- Se necessário, execute apenas as partes que não deram erro

