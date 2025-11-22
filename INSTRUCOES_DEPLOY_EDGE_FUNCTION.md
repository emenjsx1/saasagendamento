# 🚀 Instruções para Deploy da Edge Function de Pagamento

## ⚠️ IMPORTANTE: A Edge Function precisa ser deployada no Supabase

A Edge Function `process-payment` foi criada mas ainda não foi deployada. Isso causa o erro de CORS porque a função não existe ainda no servidor.

## 📋 Opção 1: Deploy via CLI do Supabase (Recomendado)

### 1. Instalar Supabase CLI (se ainda não tiver)

```bash
# Windows (PowerShell)
irm https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip -OutFile supabase.zip
Expand-Archive supabase.zip -DestinationPath .
.\supabase.exe --version

# Ou via npm
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

### 4. Download da função (se já existe no Supabase)

Se você já criou a função no Dashboard e quer fazer download:

```bash
supabase functions download process-payment
```

⚠️ **Importante**: O nome correto é `process-payment` (não `process-payme`).

### 5. Deploy da função

```bash
supabase functions deploy process-payment
```

## 📋 Opção 2: Deploy via Dashboard do Supabase

### 1. Acesse o Supabase Dashboard

1. Vá para [https://app.supabase.com](https://app.supabase.com)
2. Faça login
3. Selecione seu projeto

### 2. Vá para Edge Functions

1. No menu lateral, clique em **"Edge Functions"**
2. Clique em **"Create a new function"**
3. Nome: `process-payment`

### 3. Copie o código

1. Abra o arquivo: `supabase/functions/process-payment/index.ts`
2. **Copie TODO o conteúdo**
3. **Cole no editor** da Edge Function
4. Clique em **"Deploy"**

### 4. Configure variáveis de ambiente (Opcional)

Se quiser usar variáveis de ambiente diferentes dos valores padrão, configure em:
- **Edge Functions** → **Settings** → **Secrets**

Variáveis disponíveis:
- `MPESA_ACCESS_TOKEN` (opcional, usa valor padrão se não configurado)
- `EMOLA_ACCESS_TOKEN` (opcional, usa valor padrão se não configurado)
- `MPESA_WALLET_ID` (padrão: 993607)
- `EMOLA_WALLET_ID` (padrão: 993606)

## ⚠️ PASSO CRÍTICO: Desabilitar Verificação JWT

**IMPORTANTE**: Para que o CORS funcione corretamente, você **DEVE desabilitar a verificação JWT** para esta função:

1. No Dashboard do Supabase, vá para **Edge Functions** → **`process-payment`** → **Settings**
2. Encontre a opção **"Verify JWT"** ou **"JWT Verification"**
3. **Desabilite** essa opção (toggle OFF)
4. Clique em **"Save"**

⚠️ **Por que?** O Supabase bloqueia requisições OPTIONS (preflight) se JWT verification estiver habilitada, causando erro de CORS.

Para mais detalhes, consulte: `SOLUCAO_CORS_EDGE_FUNCTION.md`

## ✅ Verificar se funcionou

Após o deploy e desabilitar JWT verification, teste novamente o pagamento. O erro de CORS deve desaparecer.

## 🆘 Se ainda houver erro

1. Verifique se a função foi deployada: Dashboard → Edge Functions → `process-payment`
2. Verifique os logs: Dashboard → Edge Functions → `process-payment` → Logs
3. Teste a função diretamente:
   ```bash
   curl -X POST https://ihozrsfnfmwmrkbzpqlj.supabase.co/functions/v1/process-payment \
     -H "Content-Type: application/json" \
     -H "apikey: SUA_ANON_KEY" \
     -d '{"amount": 3, "phone": "855253617", "method": "mpesa", "reference": "teste123"}'
   ```

## 📝 Nota sobre CORS

A Edge Function já está configurada com headers CORS corretos:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
- `Access-Control-Allow-Methods: POST, OPTIONS`

Após o deploy, os pagamentos devem funcionar sem problemas de CORS! ✅


