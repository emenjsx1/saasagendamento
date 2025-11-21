# 🚀 Instruções para Criar a Tabela Consolidada

## ⚠️ IMPORTANTE: Execute a Migration no Supabase

A mensagem "Tabela user_consolidated não encontrada ou vazia" aparece porque a tabela ainda não foi criada no banco de dados.

## 📋 Passo a Passo

### 1. Acesse o Supabase Dashboard

1. Vá para [https://app.supabase.com](https://app.supabase.com)
2. Faça login na sua conta
3. Selecione o projeto correto

### 2. Abra o SQL Editor

1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New query"** para criar uma nova query

### 3. Execute a Migration

1. Abra o arquivo `supabase/migrations/create_user_consolidated_table.sql` no seu editor
2. **Copie TODO o conteúdo** do arquivo
3. **Cole no SQL Editor** do Supabase
4. Clique em **"Run"** ou pressione `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### 4. Verificar se Funcionou

Execute esta query para verificar:

```sql
-- Verificar se a tabela foi criada
SELECT * FROM user_consolidated LIMIT 5;

-- Verificar estrutura da tabela
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_consolidated';
```

### 5. Popular com Dados Existentes

Após criar a tabela, execute esta função para popular com os usuários existentes:

```sql
SELECT populate_user_consolidated();
```

Isso vai criar registros na tabela consolidada para todos os usuários que já existem no sistema.

### 6. Verificar Resultado

```sql
-- Ver quantos usuários foram populados
SELECT COUNT(*) as total_usuarios FROM user_consolidated;

-- Ver alguns exemplos
SELECT 
  user_id, 
  email, 
  first_name, 
  last_name,
  business_name,
  plan_name,
  subscription_status,
  role
FROM user_consolidated 
LIMIT 10;
```

## ✅ Após Executar

Depois de executar a migration:

1. ✅ A tabela `user_consolidated` será criada
2. ✅ Os triggers serão configurados para atualização automática
3. ✅ Os dados existentes serão populados
4. ✅ Novos usuários serão automaticamente adicionados à tabela

## 🔍 Verificar se Está Funcionando

No console do navegador, você deve ver:

```
✅ Dados consolidados carregados da tabela user_consolidated: X usuários
```

Ao invés de:

```
⚠️ Tabela user_consolidated não encontrada ou vazia, usando fallback...
```

## 🆘 Problemas Comuns

### Erro: "relation user_consolidated does not exist"

**Solução**: A migration não foi executada. Execute o arquivo SQL completo.

### Erro: "permission denied"

**Solução**: Certifique-se de estar usando uma conta com permissões de administrador no Supabase.

### Tabela criada mas vazia

**Solução**: Execute `SELECT populate_user_consolidated();` para popular com dados existentes.

### Triggers não funcionam

**Solução**: Verifique se os triggers foram criados:

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'user_consolidated' 
   OR trigger_name LIKE '%user_consolidated%';
```

## 📞 Suporte

Se tiver problemas, verifique:

1. ✅ O arquivo SQL foi copiado completamente
2. ✅ Não há erros no SQL Editor do Supabase
3. ✅ Você tem permissões de administrador
4. ✅ O projeto correto está selecionado


