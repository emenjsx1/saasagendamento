# 🚀 Instruções para Deploy da Edge Function send-reminder-webhook

## ⚠️ IMPORTANTE: A Edge Function precisa ser deployada no Supabase

A Edge Function `send-reminder-webhook` foi criada mas precisa ser deployada para funcionar.

## 📋 Opção 1: Deploy via CLI do Supabase (Recomendado)

### 1. Instalar Supabase CLI (se ainda não tiver)

**Windows (PowerShell):**
```powershell
irm https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip -OutFile supabase.zip
Expand-Archive supabase.zip -DestinationPath .
.\supabase.exe --version
```

**Ou via npm:**
```bash
npm install -g supabase
```

### 2. Login no Supabase

```bash
supabase login
```

### 3. Linkar ao projeto

```bash
supabase link --project-ref ihozrsfnfmwmrkbzpqlj
```

### 4. Deploy da função

```bash
supabase functions deploy send-reminder-webhook
```

## 📋 Opção 2: Deploy via Dashboard do Supabase

### 1. Acesse o Supabase Dashboard

1. Vá para [https://app.supabase.com](https://app.supabase.com)
2. Faça login
3. Selecione seu projeto

### 2. Vá para Edge Functions

1. No menu lateral, clique em **"Edge Functions"**
2. Clique em **"Create a new function"**
3. Nome: `send-reminder-webhook`

### 3. Copie o código

1. Abra o arquivo: `supabase/functions/send-reminder-webhook/index.ts`
2. **Copie TODO o conteúdo**
3. **Cole no editor** da Edge Function
4. Clique em **"Deploy"**

## ⚠️ PASSO CRÍTICO: Desabilitar Verificação JWT

**IMPORTANTE**: Para que o CORS funcione corretamente, você **DEVE desabilitar a verificação JWT** para esta função:

1. No Dashboard do Supabase, vá para **Edge Functions** → **`send-reminder-webhook`** → **Settings**
2. Encontre a opção **"Verify JWT"** ou **"JWT Verification"**
3. **Desabilite** essa opção (toggle OFF)
4. Clique em **"Save"**

⚠️ **Por que?** O Supabase bloqueia requisições OPTIONS (preflight) se JWT verification estiver habilitada, causando erro de CORS.

## ✅ Verificar se funcionou

Após o deploy e desabilitar JWT verification, teste a função:

1. Acesse `/dashboard/reminders`
2. Clique no botão "Testar Webhook"
3. Deve aparecer mensagem de sucesso

Ou teste via curl:
```bash
curl -X POST https://ihozrsfnfmwmrkbzpqlj.supabase.co/functions/v1/send-reminder-webhook \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_ANON_KEY" \
  -d '{
    "reminder_id": "test-123",
    "business_id": "test",
    "client_name": "Cliente Teste",
    "client_whatsapp": "841234567",
    "message": "Teste de lembrete",
    "send_via": "whatsapp"
  }'
```

## 📝 Nota sobre CORS

A Edge Function já está configurada com headers CORS corretos:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
- `Access-Control-Allow-Methods: POST, GET, OPTIONS`

Após o deploy, os lembretes devem funcionar sem problemas de CORS! ✅


