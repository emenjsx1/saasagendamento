# 🔧 SOLUÇÃO RÁPIDA - Problema de RLS

## ⚠️ Problema

A tabela `user_consolidated` existe, mas o acesso está bloqueado por **RLS (Row Level Security)** sem políticas configuradas.

## ✅ Solução Rápida (1 minuto)

### Execute este SQL no Supabase:

```sql
ALTER TABLE user_consolidated DISABLE ROW LEVEL SECURITY;
```

### Como executar:

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Clique em **New query**
4. Cole o comando acima
5. Clique em **Run**

**Pronto!** ✅ A área admin agora consegue acessar a tabela.

---

## 📁 Arquivos Disponíveis

- **`CORRIGIR_RLS_AGORA.sql`** - Script simples e direto (recomendado)
- **`supabase/migrations/fix_user_consolidated_rls.sql`** - Script completo com opções

## 🔍 Verificar se Funcionou

Execute esta query para verificar:

```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'user_consolidated';
```

Se `rls_enabled` for `false`, está correto! ✅

## 🎯 Resultado Esperado

Após executar, você verá no console:

```
✅ Dados consolidados carregados da tabela user_consolidated: X usuários
```

Ao invés de:

```
⚠️ Acesso bloqueado por RLS na tabela user_consolidated...
```


