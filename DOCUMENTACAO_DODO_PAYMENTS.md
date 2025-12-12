# 📄 Documentação Completa - Integração Dodo Payments (Cartão de Crédito/Débito)

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Configuração Inicial](#configuração-inicial)
4. [Fluxo de Pagamento com Cartão](#fluxo-de-pagamento-com-cartão)
5. [Estrutura da API](#estrutura-da-api)
6. [Webhooks](#webhooks)
7. [Tratamento de Erros](#tratamento-de-erros)
8. [Variáveis de Ambiente](#variáveis-de-ambiente)

---

## 🎯 Visão Geral

Este sistema integra o **Dodo Payments** para aceitar pagamentos com cartão de crédito/débito, além dos métodos existentes (M-Pesa e e-Mola). O Dodo Payments é uma plataforma completa de pagamentos e billing para SaaS, AI e produtos digitais.

### Métodos de Pagamento Disponíveis

O sistema agora suporta três métodos de pagamento:
- **M-Pesa** (Vodacom) - Mobile Money
- **e-Mola** (Movitel) - Mobile Money  
- **Cartão de Crédito/Débito** (Dodo Payments) - Cartões internacionais

### Documentação Oficial

- **Documentação**: https://docs.dodopayments.com/introduction
- **Dashboard**: https://app.dodopayments.com
- **API Reference**: Disponível na documentação oficial

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────┐
│  Frontend   │ (React/TypeScript)
│ CheckoutPage│
└──────┬──────┘
       │ Usuário seleciona "Cartão"
       │ processDodoPayment()
       ▼
┌─────────────────────────┐
│ Dodo Payments API       │
│ (Payment Links)         │
└──────┬──────────────────┘
       │ Redireciona para checkout
       ▼
┌─────────────────────────┐
│ Dodo Payments Checkout  │
│ (Página de Pagamento)   │
└──────┬──────────────────┘
       │ Pagamento processado
       │ Webhook → Supabase Edge Function
       ▼
┌─────────────────────────┐
│ Supabase Edge Function   │
│ process-dodo-webhook     │
│ (Processa webhook)       │
└──────┬──────────────────┘
       │ Atualiza banco de dados
       ▼
┌─────────────────────────┐
│  Supabase Database       │
│  - subscriptions         │
│  - payments              │
│  - user_consolidated     │
└─────────────────────────┘
```

---

## ⚙️ Configuração Inicial

### 1. Criar Conta no Dodo Payments

1. Acesse https://app.dodopayments.com
2. Crie uma conta usando seu email
3. Complete o processo de verificação

### 2. Obter Credenciais da API

1. No dashboard do Dodo Payments, vá para **Settings** → **API Keys**
2. Copie sua **API Key** (chave privada)
3. Copie sua **Public Key** (chave pública, se necessário)

### 3. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no seu arquivo `.env` ou nas configurações do Vercel/Supabase:

```env
# Dodo Payments
VITE_DODO_API_KEY=seu_api_key_aqui
VITE_DODO_PUBLIC_KEY=sua_public_key_aqui (opcional)
```

### 4. Configurar Webhook

1. No dashboard do Dodo Payments, vá para **Settings** → **Webhooks**
2. Adicione a URL do webhook:
   ```
   https://ihozrsfnfmwmrkbzpqlj.supabase.co/functions/v1/process-dodo-webhook
   ```
3. Selecione os eventos:
   - `payment.completed`
   - `payment.failed`
   - `payment.refunded`

### 5. Configurar Callback URL (Opcional)

No dashboard do Dodo Payments, configure a URL de retorno após o pagamento:

```
https://seudominio.com/payment-callback
```

Isso permite que o usuário seja redirecionado de volta ao seu site após o pagamento.

---

## 🔄 Fluxo de Pagamento com Cartão

### 1. Seleção do Método de Pagamento

O usuário seleciona "Cartão de Crédito/Débito" na página de checkout.

**Arquivo**: `src/pages/CheckoutPage.tsx` (linhas 43-60)

```typescript
const PAYMENT_METHODS: PaymentMethod[] = [
  {
    key: 'mpesa',
    name: 'M-Pesa',
    icon: '...',
  },
  {
    key: 'emola',
    name: 'e-Mola',
    icon: '...',
  },
  {
    key: 'card',
    name: 'Cartão de Crédito/Débito',
    icon: '...',
  },
];
```

### 2. Processamento do Pagamento

Quando o usuário clica em "Pagar" com cartão selecionado:

**Arquivo**: `src/pages/CheckoutPage.tsx` (linhas 192-228)

```typescript
if (selectedPaymentMethod === 'card') {
  // Criar link de pagamento via Dodo Payments
  const dodoResponse = await processDodoPayment({
    amount: calculatedPrice,
    currency: currentCurrency.key.toLowerCase(),
    customerEmail: customerEmail,
    customerName: customerName,
    reference: reference,
    metadata: {
      user_id: user.id,
      plan_name: selectedPlan.name,
      billing_period: billingPeriod,
      business_id: businessId,
    },
  });

  // Redirecionar para página de checkout do Dodo Payments
  // O pagamento será processado lá
}
```

### 3. Criação do Payment Link

**Arquivo**: `src/utils/dodoPayments.ts` (função `createDodoPaymentLink`)

```typescript
const response = await fetch('https://api.dodopayments.com/v1/payment-links', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DODO_API_KEY}`,
  },
  body: JSON.stringify({
    amount: request.amount,
    currency: request.currency.toUpperCase(),
    customer_email: request.customerEmail,
    customer_name: request.customerName,
    reference: request.reference,
    metadata: request.metadata || {},
  }),
});
```

### 4. Redirecionamento para Checkout

O usuário é redirecionado para a página de checkout do Dodo Payments, onde:
- Insere os dados do cartão
- Confirma o pagamento
- É redirecionado de volta para o site

### 5. Processamento do Webhook

Após o pagamento ser processado, o Dodo Payments envia um webhook para a Edge Function:

**Arquivo**: `supabase/functions/process-dodo-webhook/index.ts` (a ser criado)

```typescript
// Recebe webhook do Dodo Payments
// Verifica assinatura
// Atualiza banco de dados
// Cria subscription e payment records
```

---

## 📡 Estrutura da API

### Endpoint: Criar Payment Link

**URL**: `https://api.dodopayments.com/v1/payment-links`

**Método**: `POST`

**Headers**:
```
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

**Body (JSON)**:
```json
{
  "amount": 1000,
  "currency": "MZN",
  "customer_email": "cliente@email.com",
  "customer_name": "Nome do Cliente",
  "reference": "AgenCode-1234567890",
  "metadata": {
    "user_id": "uuid",
    "plan_name": "Plano Básico",
    "billing_period": 1
  }
}
```

**Resposta de Sucesso (200)**:
```json
{
  "id": "payment_link_id",
  "checkout_url": "https://checkout.dodopayments.com/...",
  "status": "pending",
  "amount": 1000,
  "currency": "MZN",
  "reference": "AgenCode-1234567890"
}
```

### Endpoint: Verificar Status do Pagamento

**URL**: `https://api.dodopayments.com/v1/payments/{payment_id}`

**Método**: `GET`

**Headers**:
```
Authorization: Bearer {API_KEY}
```

**Resposta de Sucesso (200)**:
```json
{
  "id": "payment_id",
  "status": "paid",
  "amount": 1000,
  "currency": "MZN",
  "reference": "AgenCode-1234567890",
  "customer_email": "cliente@email.com",
  "created_at": "2025-01-15T10:00:00Z",
  "paid_at": "2025-01-15T10:05:00Z"
}
```

---

## 🔔 Webhooks

### Configuração do Webhook

1. **URL do Webhook**: 
   ```
   https://ihozrsfnfmwmrkbzpqlj.supabase.co/functions/v1/process-dodo-webhook
   ```

2. **Eventos a Escutar**:
   - `payment.completed` - Pagamento concluído com sucesso
   - `payment.failed` - Pagamento falhou
   - `payment.refunded` - Pagamento reembolsado

### Estrutura do Webhook

**Evento**: `payment.completed`

```json
{
  "event": "payment.completed",
  "data": {
    "id": "payment_id",
    "status": "paid",
    "amount": 1000,
    "currency": "MZN",
    "reference": "AgenCode-1234567890",
    "customer_email": "cliente@email.com",
    "metadata": {
      "user_id": "uuid",
      "plan_name": "Plano Básico",
      "billing_period": 1,
      "business_id": "uuid"
    },
    "created_at": "2025-01-15T10:00:00Z",
    "paid_at": "2025-01-15T10:05:00Z"
  }
}
```

### Processamento do Webhook

A Edge Function `process-dodo-webhook` deve:

1. **Verificar a assinatura** do webhook (segurança)
2. **Extrair os dados** do pagamento
3. **Buscar o usuário** pelo `user_id` no metadata
4. **Criar a subscription** se o pagamento for bem-sucedido
5. **Registrar o pagamento** na tabela `payments`
6. **Atualizar** a tabela `user_consolidated`

---

## ⚠️ Tratamento de Erros

### Erros Comuns

#### 1. API Key Não Configurada
**Erro**: `Dodo Payments API key not configured`
**Solução**: Configure `VITE_DODO_API_KEY` nas variáveis de ambiente

#### 2. Valor Mínimo
**Erro**: `Amount must be at least X`
**Solução**: Verifique o valor mínimo aceito pelo Dodo Payments (geralmente 1 unidade da moeda)

#### 3. Moeda Não Suportada
**Erro**: `Currency not supported`
**Solução**: Verifique se a moeda está na lista de moedas suportadas pelo Dodo Payments

#### 4. Webhook Não Recebido
**Erro**: Webhook não é processado
**Solução**: 
- Verifique se a URL do webhook está correta no dashboard
- Verifique se a Edge Function está deployada
- Verifique os logs da Edge Function

### Códigos de Status HTTP

- **200**: Sucesso
- **400**: Erro de validação (dados inválidos)
- **401**: Não autorizado (API key inválida)
- **404**: Recurso não encontrado
- **500**: Erro interno do servidor

---

## 🔐 Variáveis de Ambiente

### Frontend (.env)

```env
# Dodo Payments
VITE_DODO_API_KEY=seu_api_key_aqui
VITE_DODO_PUBLIC_KEY=sua_public_key_aqui (opcional)
```

### Supabase Edge Function (Secrets)

Configure no Supabase Dashboard → Edge Functions → Settings → Secrets:

```env
DODO_API_KEY=seu_api_key_aqui
DODO_WEBHOOK_SECRET=seu_webhook_secret_aqui
```

---

## 📝 Exemplo de Implementação Completa

### Frontend: Processar Pagamento

```typescript
import { processDodoPayment } from '@/utils/dodoPayments';

const handleCardPayment = async () => {
  const response = await processDodoPayment({
    amount: 1000,
    currency: 'mzn',
    customerEmail: 'cliente@email.com',
    customerName: 'Nome do Cliente',
    reference: `AgenCode-${Date.now()}`,
    metadata: {
      user_id: user.id,
      plan_name: 'Plano Básico',
      billing_period: 1,
    },
  });

  if (response.success) {
    // Usuário será redirecionado para checkout
    // O webhook processará o pagamento após confirmação
  }
};
```

### Backend: Processar Webhook

```typescript
// supabase/functions/process-dodo-webhook/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Verificar assinatura do webhook
    const signature = req.headers.get('x-dodo-signature');
    // ... validação de assinatura ...

    const { event, data } = await req.json();

    if (event === 'payment.completed') {
      const { metadata, id, amount, reference } = data;
      
      // Criar subscription
      // Registrar pagamento
      // Atualizar user_consolidated
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});
```

---

## ✅ Checklist de Implementação

- [x] Adicionar método de pagamento "Cartão" na interface
- [x] Criar utilitário `dodoPayments.ts`
- [x] Integrar processamento de pagamento com cartão
- [ ] Configurar variáveis de ambiente
- [ ] Criar Edge Function para webhook
- [ ] Configurar webhook no dashboard do Dodo Payments
- [ ] Testar fluxo completo de pagamento
- [ ] Implementar página de callback/retorno
- [ ] Adicionar tratamento de erros específicos
- [ ] Documentar processo de reembolso (se necessário)

---

## 🔗 Links Úteis

- **Documentação Dodo Payments**: https://docs.dodopayments.com/introduction
- **Dashboard**: https://app.dodopayments.com
- **API Reference**: Disponível na documentação oficial
- **Suporte**: Através do dashboard ou documentação

---

## 📅 Última Atualização

Este documento foi criado em: **Janeiro 2025**

**Versão**: 1.0

---

**Fim do Documento**

