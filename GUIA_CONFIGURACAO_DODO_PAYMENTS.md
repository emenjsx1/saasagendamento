# 🎯 Guia Passo a Passo - Configuração Dodo Payments

## ✅ Passo 1: Configurar a API Key no Frontend

### Opção A: Criar arquivo `.env` na raiz do projeto

1. Na raiz do projeto (mesma pasta onde está o `package.json`), crie um arquivo chamado `.env`
2. Adicione a seguinte linha:

```env
VITE_DODO_API_KEY=4RAOYsDjTqdywX8O.BHI-m4Sss5iPnX_zrwPAW6N1BCvA3SUPOujjR7FuOOcbaRHl
```

3. Salve o arquivo
4. **IMPORTANTE**: Reinicie o servidor de desenvolvimento se estiver rodando:
   - Pare o servidor (Ctrl+C)
   - Execute novamente: `npm run dev`

### Opção B: Configurar no Vercel (se estiver usando Vercel)

1. Acesse https://vercel.com
2. Vá para seu projeto
3. Clique em **Settings** → **Environment Variables**
4. Adicione:
   - **Name**: `VITE_DODO_API_KEY`
   - **Value**: `4RAOYsDjTqdywX8O.BHI-m4Sss5iPnX_zrwPAW6N1BCvA3SUPOujjR7FuOOcbaRHl`
5. Clique em **Save**
6. Faça um novo deploy

---

## 🚀 Passo 2: Deploy da Edge Function (process-dodo-webhook)

### O que é uma Edge Function?

Uma **Edge Function** é um código que roda no servidor do Supabase. Ela recebe os webhooks do Dodo Payments quando um pagamento é confirmado e atualiza seu banco de dados automaticamente.

**Por que precisa fazer deploy?**
- O código da Edge Function está apenas no seu computador
- Precisamos enviar esse código para o servidor do Supabase
- Assim, o Dodo Payments consegue enviar os webhooks para ela

### Método 1: Deploy via Dashboard do Supabase (MAIS FÁCIL) ⭐

#### Passo 1: Acessar o Dashboard

1. Abra seu navegador
2. Vá para: https://app.supabase.com
3. Faça login
4. Selecione seu projeto (o que tem o ID: `ihozrsfnfmwmrkbzpqlj`)

#### Passo 2: Criar a Edge Function

1. No menu lateral esquerdo, procure por **"Edge Functions"**
2. Clique em **"Edge Functions"**
3. Clique no botão **"Create a new function"** ou **"New Function"**
4. Dê o nome: `process-dodo-webhook`
5. Clique em **"Create function"**

#### Passo 3: Copiar o Código

1. Abra o arquivo no seu computador:
   ```
   supabase/functions/process-dodo-webhook/index.ts
   ```
2. **Selecione TODO o conteúdo** (Ctrl+A)
3. **Copie** (Ctrl+C)
4. Volte para o Dashboard do Supabase
5. **Cole** o código no editor da Edge Function (Ctrl+V)

#### Passo 4: Fazer o Deploy

1. Clique no botão **"Deploy"** ou **"Save"**
2. Aguarde alguns segundos
3. Você verá uma mensagem de sucesso ✅

#### Passo 5: Configurar Variáveis de Ambiente (Secrets)

1. Ainda na página da Edge Function, procure por **"Settings"** ou **"Configuration"**
2. Vá para a seção **"Secrets"** ou **"Environment Variables"**
3. Adicione as seguintes variáveis:

   **Variável 1:**
   - **Name**: `SUPABASE_URL`
   - **Value**: `https://ihozrsfnfmwmrkbzpqlj.supabase.co`

   **Variável 2:**
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: (Você precisa pegar essa chave no Dashboard)
     - Vá para **Settings** → **API** → **Service Role Key**
     - Copie a chave (ela começa com `eyJ...`)
     - Cole aqui

   **Variável 3 (Opcional):**
   - **Name**: `DODO_WEBHOOK_SECRET`
   - **Value**: (Deixe vazio por enquanto, pode adicionar depois)

4. Clique em **"Save"** ou **"Add"**

#### Passo 6: Desabilitar JWT Verification (IMPORTANTE!)

1. Ainda nas **Settings** da Edge Function
2. Procure por **"Verify JWT"** ou **"JWT Verification"**
3. **Desabilite** essa opção (toggle OFF)
4. Isso é necessário para que os webhooks funcionem corretamente

#### Passo 7: Copiar a URL da Edge Function

1. Ainda na página da Edge Function
2. Você verá uma URL como:
   ```
   https://ihozrsfnfmwmrkbzpqlj.supabase.co/functions/v1/process-dodo-webhook
   ```
3. **Copie essa URL** - você vai precisar dela no próximo passo!

---

### Método 2: Deploy via CLI (Alternativo)

Se preferir usar a linha de comando:

#### Passo 1: Instalar Supabase CLI

**Windows (PowerShell):**
```powershell
# Opção 1: Via npm (recomendado)
npm install -g supabase

# Opção 2: Download direto
irm https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip -OutFile supabase.zip
Expand-Archive supabase.zip -DestinationPath .
```

#### Passo 2: Login no Supabase

```bash
supabase login
```

#### Passo 3: Linkar ao Projeto

```bash
supabase link --project-ref ihozrsfnfmwmrkbzpqlj
```

#### Passo 4: Fazer Deploy

```bash
supabase functions deploy process-dodo-webhook
```

#### Passo 5: Configurar Secrets

```bash
# Configurar URL do Supabase
supabase secrets set SUPABASE_URL=https://ihozrsfnfmwmrkbzpqlj.supabase.co

# Configurar Service Role Key (substitua pela sua chave)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

---

## 🔔 Passo 3: Configurar Webhook no Dodo Payments

Agora vamos configurar o Dodo Payments para enviar notificações quando um pagamento for confirmado.

### Passo 1: Acessar o Dashboard do Dodo Payments

1. Vá para: https://app.dodopayments.com
2. Faça login

### Passo 2: Configurar Webhook

1. No menu, vá para **"Settings"** ou **"Configurações"**
2. Procure por **"Webhooks"** ou **"Webhooks & Events"**
3. Clique em **"Add Webhook"** ou **"Create Webhook"**

### Passo 3: Preencher os Dados

1. **URL do Webhook**: Cole a URL que você copiou no Passo 7 do deploy:
   ```
   https://ihozrsfnfmwmrkbzpqlj.supabase.co/functions/v1/process-dodo-webhook
   ```

2. **Eventos a Escutar**: Selecione:
   - ✅ `payment.completed` (Pagamento concluído)
   - ✅ `payment.failed` (Pagamento falhou)
   - ✅ `payment.refunded` (Pagamento reembolsado)

3. Clique em **"Save"** ou **"Create"**

### Passo 4: Testar o Webhook (Opcional)

Alguns dashboards permitem testar o webhook. Se houver essa opção, clique em **"Test"** para verificar se está funcionando.

---

## ✅ Passo 4: Verificar se Está Tudo Funcionando

### Teste 1: Verificar se a Edge Function está deployada

1. Vá para o Dashboard do Supabase
2. **Edge Functions** → `process-dodo-webhook`
3. Você deve ver a função listada ✅

### Teste 2: Verificar os Logs

1. No Dashboard do Supabase, vá para **Edge Functions** → `process-dodo-webhook`
2. Clique em **"Logs"**
3. Quando um pagamento for processado, você verá logs aqui

### Teste 3: Testar um Pagamento

1. Acesse seu site
2. Vá para a página de checkout
3. Selecione **"Cartão de Crédito/Débito"**
4. Complete o pagamento
5. Verifique se:
   - O usuário é redirecionado para o Dodo Payments ✅
   - Após o pagamento, a subscription é criada automaticamente ✅
   - O pagamento aparece na tabela `payments` ✅

---

## 🆘 Resolução de Problemas

### Problema: "API key not configured"

**Solução:**
- Verifique se criou o arquivo `.env` na raiz do projeto
- Verifique se a variável está escrita corretamente: `VITE_DODO_API_KEY=...`
- Reinicie o servidor de desenvolvimento

### Problema: Webhook não está sendo recebido

**Solução:**
1. Verifique se a Edge Function está deployada
2. Verifique se a URL do webhook está correta no Dodo Payments
3. Verifique os logs da Edge Function no Supabase
4. Verifique se desabilitou o JWT Verification

### Problema: Erro ao fazer deploy

**Solução:**
- Use o Método 1 (Dashboard) que é mais simples
- Verifique se copiou TODO o código do arquivo `index.ts`
- Verifique se não há erros de sintaxe no código

---

## 📋 Checklist Final

Antes de considerar tudo configurado, verifique:

- [ ] Arquivo `.env` criado com `VITE_DODO_API_KEY`
- [ ] Servidor de desenvolvimento reiniciado
- [ ] Edge Function `process-dodo-webhook` deployada
- [ ] Secrets configurados (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY)
- [ ] JWT Verification desabilitado
- [ ] Webhook configurado no Dodo Payments
- [ ] URL do webhook está correta
- [ ] Eventos selecionados no webhook

---

## 🎉 Pronto!

Agora seu sistema está configurado para aceitar pagamentos com cartão via Dodo Payments! 

Quando um cliente pagar com cartão:
1. Ele será redirecionado para o Dodo Payments
2. Após confirmar o pagamento, o Dodo Payments enviará um webhook
3. A Edge Function processará o webhook
4. A subscription será criada automaticamente
5. O pagamento será registrado no banco de dados

---

**Última atualização**: Janeiro 2025


