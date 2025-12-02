# Instruções para Executar Migrations de Funcionários

## ⚠️ IMPORTANTE

As migrations precisam ser executadas no Supabase para que o sistema de funcionários funcione corretamente.

## Passo a Passo

### 1. Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)

### 2. Executar as Migrations na Ordem

Execute cada migration **na ordem abaixo**, uma de cada vez:

#### Migration 1: Criar Tabela de Funcionários

Copie e cole o conteúdo do arquivo:
`supabase/migrations/create_employees_table.sql`

Clique em **Run** para executar.

#### Migration 2: Adicionar employee_id em Appointments

Copie e cole o conteúdo do arquivo:
`supabase/migrations/add_employee_to_appointments.sql`

Clique em **Run** para executar.

#### Migration 3: Adicionar auto_assign_employees em Businesses

Copie e cole o conteúdo do arquivo:
`supabase/migrations/add_auto_assign_to_businesses.sql`

Clique em **Run** para executar.

### 3. Verificar se Funcionou

Execute esta query para verificar:

```sql
-- Verificar se a tabela employees existe
SELECT * FROM employees LIMIT 1;

-- Verificar se a coluna employee_id existe em appointments
SELECT employee_id FROM appointments LIMIT 1;

-- Verificar se a coluna auto_assign_employees existe em businesses
SELECT auto_assign_employees FROM businesses LIMIT 1;
```

Se todas as queries retornarem sem erro, as migrations foram executadas com sucesso! ✅

## Arquivos de Migration

Os arquivos estão localizados em:
- `supabase/migrations/create_employees_table.sql`
- `supabase/migrations/add_employee_to_appointments.sql`
- `supabase/migrations/add_auto_assign_to_businesses.sql`

## Nota

Após executar as migrations, recarregue a página do aplicativo para que as mudanças tenham efeito.

