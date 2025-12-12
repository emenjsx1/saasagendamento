# ⚡ Resumo Rápido - Configuração Dodo Payments

## 🎯 O que você precisa fazer (3 passos simples)

### ✅ Passo 1: Configurar API Key (2 minutos)

1. Crie um arquivo chamado `.env` na raiz do projeto
2. Adicione esta linha:
   ```
   VITE_DODO_API_KEY=4RAOYsDjTqdywX8O.BHI-m4Sss5iPnX_zrwPAW6N1BCvA3SUPOujjR7FuOOcbaRHl
   ```
3. Reinicie o servidor (`npm run dev`)

📖 **Guia detalhado**: Veja `COMO_CRIAR_ARQUIVO_ENV.md`

---

### 🚀 Passo 2: Deploy da Edge Function (5 minutos)

#### O que é uma Edge Function?

Imagine que você tem um código no seu computador que precisa rodar na internet. 
A Edge Function é esse código rodando no servidor do Supabase.

**Por que precisa fazer deploy?**
- O código está só no seu computador 📱
- Precisamos enviar para o servidor 🌐
- Assim o Dodo Payments consegue enviar notificações 📨

#### Como fazer (Método Fácil):

1. **Acesse**: https://app.supabase.com
2. **Vá para**: Edge Functions (menu lateral)
3. **Clique**: "Create a new function"
4. **Nome**: `process-dodo-webhook`
5. **Copie o código** do arquivo: `supabase/functions/process-dodo-webhook/index.ts`
6. **Cole** no editor do Supabase
7. **Clique**: "Deploy" ✅
8. **Configure Secrets**:
   - `SUPABASE_URL` = `https://ihozrsfnfmwmrkbzpqlj.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (pegue no Settings → API)
9. **Desabilite**: "Verify JWT" (toggle OFF)

📖 **Guia detalhado**: Veja `GUIA_CONFIGURACAO_DODO_PAYMENTS.md` (Passo 2)

---

### 🔔 Passo 3: Configurar Webhook (3 minutos)

1. **Acesse**: https://app.dodopayments.com
2. **Vá para**: Settings → Webhooks
3. **Adicione webhook**:
   - **URL**: `https://ihozrsfnfmwmrkbzpqlj.supabase.co/functions/v1/process-dodo-webhook`
   - **Eventos**: `payment.completed`, `payment.failed`, `payment.refunded`
4. **Salve** ✅

---

## 🎉 Pronto!

Agora seu sistema aceita pagamentos com cartão!

### Como funciona:

```
Cliente escolhe cartão
    ↓
Redireciona para Dodo Payments
    ↓
Cliente paga
    ↓
Dodo Payments envia webhook
    ↓
Edge Function processa
    ↓
Subscription criada automaticamente ✅
```

---

## 🆘 Precisa de ajuda?

- **Guia completo**: `GUIA_CONFIGURACAO_DODO_PAYMENTS.md`
- **Documentação técnica**: `DOCUMENTACAO_DODO_PAYMENTS.md`
- **Como criar .env**: `COMO_CRIAR_ARQUIVO_ENV.md`

---

**Tempo total estimado**: 10 minutos ⏱️


