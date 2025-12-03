# 🔧 Solução: Erro na Área Admin - Usuários não aparecem

## ⚠️ Problemas Identificados

### 1. Coluna `is_blocked` não existe na tabela `profiles`
**Erro:**
```
column profiles.is_blocked does not exist
```

**Causa:** A coluna `is_blocked` não foi criada na tabela `profiles`.

### 2. Coluna `expires_at` não existe na tabela `payments`
**Erro:**
```
GET .../payments?select=expires_at... 400 (Bad Request)
```

**Causa:** O código estava tentando buscar uma coluna que não existe.

## ✅ Soluções Aplicadas

### 1. Código Corrigido

- ✅ **`src/hooks/use-plan-limits.ts`**: Removida referência a `expires_at` (coluna não existe)
- ✅ **`src/pages/AdminUsersPage.tsx`**: Código já está correto, apenas precisa da coluna no banco

### 2. Script SQL Criado

Foi criado o arquivo **`CORRIGIR_COLUNAS_FALTANTES.sql`** que adiciona a coluna `is_blocked` na tabela `profiles`.

## 🚀 Como Corrigir

### Passo 1: Executar o Script SQL

1. Acesse o **Supabase Dashboard**: https://app.supabase.com
2. Vá para **SQL Editor**
3. Clique em **New query**
4. Cole o conteúdo do arquivo `CORRIGIR_COLUNAS_FALTANTES.sql`:

```sql
-- Adicionar coluna is_blocked na tabela profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles(is_blocked);

-- Comentário para documentação
COMMENT ON COLUMN profiles.is_blocked IS 'Se true, o usuário está bloqueado e não pode fazer login ou usar a plataforma';

-- Atualizar valores existentes para false
UPDATE profiles SET is_blocked = false WHERE is_blocked IS NULL;
```

5. Clique em **Run** (ou pressione `Ctrl+Enter`)

### Passo 2: Verificar se Funcionou

Execute esta query para verificar:

```sql
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'is_blocked';
```

**Resultado esperado:** Deve retornar uma linha com os dados da coluna `is_blocked`.

### Passo 3: Testar a Área Admin

1. Recarregue a página da área admin
2. Vá para **Gestão de Usuários**
3. ✅ Agora deve mostrar todos os usuários sem erros

## 📋 O que foi corrigido

### Antes:
- ❌ Erro ao buscar `profiles.is_blocked` (coluna não existe)
- ❌ Erro ao buscar `payments.expires_at` (coluna não existe)
- ❌ Área admin não mostrava usuários

### Depois:
- ✅ Coluna `is_blocked` adicionada na tabela `profiles`
- ✅ Referência a `expires_at` removida do código
- ✅ Área admin funciona corretamente
- ✅ Funcionalidade de bloquear/desbloquear usuários disponível

## 🎯 Funcionalidades Disponíveis

Após corrigir, você poderá:

1. **Ver todos os usuários** na área admin
2. **Bloquear/Desbloquear usuários** usando o botão de bloqueio
3. **Filtrar e buscar usuários** por nome ou email
4. **Ver informações completas** de cada usuário (plano, status, etc.)

## ⚠️ Nota Importante

- A coluna `is_blocked` é usada para controlar se um usuário pode fazer login
- Quando `is_blocked = true`, o usuário está bloqueado
- Quando `is_blocked = false`, o usuário está ativo
- Todos os usuários existentes serão definidos como `is_blocked = false` por padrão

## 🆘 Se ainda houver problemas

1. Verifique se o script SQL foi executado com sucesso
2. Verifique se há erros no console do navegador (F12)
3. Verifique os logs do Supabase no Dashboard
4. Certifique-se de que o RLS está desabilitado na tabela `profiles` (veja `CORRIGIR_RLS_PROFILES.sql`)

