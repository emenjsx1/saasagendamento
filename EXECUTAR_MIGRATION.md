# ⚡ EXECUTAR MIGRATION - TABELA CONSOLIDADA

## 🚨 AÇÃO NECESSÁRIA

A mensagem **"Tabela user_consolidated não encontrada"** aparece porque você precisa executar a migration SQL no Supabase.

## 📋 PASSO A PASSO RÁPIDO

### 1️⃣ Abrir Supabase Dashboard
- Acesse: https://app.supabase.com
- Faça login e selecione seu projeto

### 2️⃣ Abrir SQL Editor
- Menu lateral → **"SQL Editor"**
- Clique em **"New query"**

### 3️⃣ Copiar e Colar o SQL
- Abra o arquivo: `supabase/migrations/create_user_consolidated_table.sql`
- **Copie TODO o conteúdo** (284 linhas)
- **Cole no SQL Editor** do Supabase
- Clique em **"Run"** (ou `Ctrl+Enter`)

### 4️⃣ Popular Dados Existentes
Após executar a migration, execute esta query:

```sql
SELECT populate_user_consolidated();
```

Isso vai criar registros para todos os usuários existentes.

### 5️⃣ Verificar
Execute para confirmar:

```sql
SELECT COUNT(*) as total FROM user_consolidated;
```

Se retornar um número > 0, está funcionando! ✅

## ✅ RESULTADO ESPERADO

Após executar, você verá no console:

```
✅ Dados consolidados carregados da tabela user_consolidated: X usuários
```

Ao invés de:

```
⚠️ Tabela user_consolidated não encontrada...
```

## 🆘 PROBLEMAS?

### Erro: "relation does not exist"
→ A migration não foi executada. Execute o arquivo SQL completo.

### Erro: "permission denied"
→ Use uma conta com permissões de admin no Supabase.

### Tabela vazia
→ Execute: `SELECT populate_user_consolidated();`

---

**📁 Arquivo SQL:** `supabase/migrations/create_user_consolidated_table.sql`


