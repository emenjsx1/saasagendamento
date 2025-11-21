# 🔧 SOLUÇÃO - Problema: Mostra apenas 1 usuário (admin)

## ⚠️ Problema Identificado

A área admin está mostrando apenas **1 usuário** (o admin logado) ao invés de todos os 11 usuários.

**Causa**: RLS (Row Level Security) na tabela `profiles` está bloqueando o acesso, permitindo apenas que cada usuário veja seu próprio perfil.

## ✅ Solução Rápida

### Execute este SQL no Supabase:

```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### Como executar:

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Clique em **New query**
4. Cole o comando acima
5. Clique em **Run**

**Pronto!** ✅ A área admin agora consegue ver todos os usuários.

---

## 📁 Arquivo Criado

- **`CORRIGIR_RLS_PROFILES.sql`** - Script completo com opções

## 🔍 Verificar se Funcionou

Execute esta query para verificar:

```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';
```

Se `rls_enabled` for `false`, está correto! ✅

## 🎯 Resultado Esperado

Após executar, você verá:

```
✅ Perfis encontrados: 11
✅ Usuários mapeados: 11
```

Ao invés de:

```
✅ Perfis encontrados: 1
✅ Usuários mapeados: 1
```

## 📊 Tabelas que Precisam de RLS Desabilitado para Admin

Para a área administrativa funcionar completamente, desabilite RLS nestas tabelas:

```sql
-- Tabela de perfis
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Tabela consolidada (já feito)
ALTER TABLE user_consolidated DISABLE ROW LEVEL SECURITY;

-- Outras tabelas administrativas (se necessário)
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
```

## ⚠️ Nota de Segurança

Desabilitar RLS é apropriado para:
- ✅ Áreas administrativas internas
- ✅ Aplicações onde o controle de acesso é feito no código
- ✅ Ambientes onde você confia nos usuários admin

Se preferir manter RLS, crie políticas específicas para admins (veja o arquivo `CORRIGIR_RLS_PROFILES.sql`).


