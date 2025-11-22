# 📚 Comandos Úteis do Supabase CLI para Edge Functions

## ⚠️ Nome Correto da Função

O nome correto da função é: **`process-payment`** (com "payment" completo, não "payme")

## 🔽 Download de Funções

Para fazer download de uma função que já existe no Supabase:

```bash
# Download da função process-payment
supabase functions download process-payment
```

⚠️ **Importante**: Sempre use o nome completo `process-payment`, não `process-payme`.

## 📤 Deploy de Funções

Para fazer deploy de uma função:

```bash
# Deploy normal
supabase functions deploy process-payment

# Deploy sem verificação JWT
supabase functions deploy process-payment --no-verify-jwt
```

## 📋 Listar Funções

Para ver todas as funções disponíveis:

```bash
supabase functions list
```

## 🗑️ Deletar Função

Para deletar uma função:

```bash
supabase functions delete process-payment
```

## 📝 Ver Logs

Para ver os logs de uma função:

```bash
supabase functions logs process-payment
```

## 🔧 Comandos Gerais

```bash
# Login
supabase login

# Linkar ao projeto
supabase link --project-ref ihozrsfnfmwmrkbzpqlj

# Verificar status
supabase status
```

## 💡 Dica

Se você ver algum comando com `process-payme` (incompleto), sempre use `process-payment` (completo)!

