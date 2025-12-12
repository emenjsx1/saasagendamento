# 📄 Documentação Completa - Processo de Pagamento e-Mola/M-Pesa

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Credenciais e Configurações](#credenciais-e-configurações)
4. [Fluxo Completo do Pagamento](#fluxo-completo-do-pagamento)
5. [Estrutura da API](#estrutura-da-api)
6. [Implementação em Outro Sistema](#implementação-em-outro-sistema)
7. [Validações e Regras de Negócio](#validações-e-regras-de-negócio)
8. [Tratamento de Erros](#tratamento-de-erros)
9. [Aprovação da Conta Após Pagamento](#aprovação-da-conta-após-pagamento)
10. [Webhooks do Sistema](#webhooks-do-sistema)

---

## 🎯 Visão Geral

Este sistema utiliza a API do **e-Mola/M-Pesa Tech** (`mpesaemolatech.com`) para processar pagamentos via mobile money em Moçambique. O sistema suporta dois métodos de pagamento:
- **M-Pesa** (Vodacom)
- **e-Mola** (Movitel)

O pagamento é processado através de uma **Supabase Edge Function** que atua como intermediário entre o frontend e a API do gateway de pagamento, evitando problemas de CORS e mantendo as credenciais seguras.

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────┐
│  Frontend   │ (React/TypeScript)
│ CheckoutPage│
└──────┬──────┘
       │ POST /functions/v1/process-payment
       │ { amount, phone, method, reference }
       ▼
┌─────────────────────────┐
│ Supabase Edge Function   │
│ process-payment          │
│ (Deno Runtime)           │
└──────┬──────────────────┘
       │ POST https://mpesaemolatech.com/v1/c2b/{method}-payment/{walletId}
       │ Headers: Authorization: Bearer {accessToken}
       │ Body: { client_id, amount, phone, reference }
       ▼
┌─────────────────────────┐
│  API e-Mola/M-Pesa Tech │
│  mpesaemolatech.com     │
└──────┬──────────────────┘
       │ Resposta: { transaction_id, reference, ... }
       ▼
┌─────────────────────────┐
│  Supabase Database       │
│  - subscriptions         │
│  - payments              │
│  - user_consolidated     │
└─────────────────────────┘
```

---

## 🔐 Credenciais e Configurações

### Credenciais da API e-Mola/M-Pesa Tech

#### CLIENT_ID
```
9f903862-a780-440d-8ed5-b8d8090b180e
```

#### ACCESS_TOKEN (Token Padrão - Válido até 2026)
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5ZjkwMzg2Mi1hNzgwLTQ0MGQtOGVkNS1iOGQ4MDkwYjE4MGUiLCJqdGkiOiIzMjI0ZTdiZWJmOTY3MDc4OWE4MWUyZWUwMDg2ZTY2MmM4NTYxYjlkY2UxNzVjZGQzNTk2ODBjYTU2NTU0OGNlY2Q2YTIxZjJiMWJjMTQ0YiIsImlhdCI6MTc1NTYwNzI2Ni41MjcyNzgsIm5iZiI6MTc1NTYwNzI2Ni41MjcyODEsImV4cCI6MTc4NzE0MzI2Ni41MjM2Nywic3ViIjoiIiwic2NvcGVzIjpbXX0.NEJzqLOaMnaI4iq3OMhhXAYLHDFY_JAq45JiQVfrJDoXQVcrVR0hD0tGslRUfyn-UA6gst5CXDBbeJc4l7C8FDxJYKQffbl_w12AwLQMj0wOoV9zp_dLSsgjwbwwyoyOWaP0WXMfLZOglZI2uW1tlN00uk17gZzLjtyE2M5TWPdwsaFyMkb6PpquQNB7hAnoOYWLYza66ME7F7rP7uv0qJ1w-PIj6MsjHy8ar5Dm67ISicu0sSi1WS_8XIxVAOX1zlHUQweQTvlOQILN9W1tc2-F0mRMPxAoNwOLd641puUikL33-f5Dt0hPFceKXIM6E4hCqQX4Vgq1KMYtFNdCahqFqbjupTbQPESCXEK1coGtS76p7ArsyOZALreo18xZqvJ0wQF4XYl0qab7rvbFmypDQU19R3bEsW4rAH84g9WspdF86TNZeqefqQ3JqGgqis7FekC-wdWhS3qnM5CElzLmGNpnyqHJ7lHMDuup9ejWHjNtG64E2QqCnj6UA_ACCo14LFdReT2RAySXi58Mvv8bb47XpT1xPNFBzRGQq6u9WZCHFyO07tCPmBBeinS4oElkG1upXRvE8pO7U3plzmkBOTByMDmSnBXcFDOadwym8LYfk7SYqWSSN9-0k0kFdt8gsQpAmtKCrs_hbfihhccfbHhf4HHis23W7-kTCUs
```

#### WALLET IDs
- **M-Pesa Wallet ID**: `993607`
- **e-Mola Wallet ID**: `993606`

### URL Base da API
```
https://mpesaemolatech.com/v1/c2b/{method}-payment/{walletId}
```

Onde:
- `{method}` = `mpesa` ou `emola`
- `{walletId}` = `993607` (M-Pesa) ou `993606` (e-Mola)

### Exemplos de URLs Completas
- **M-Pesa**: `https://mpesaemolatech.com/v1/c2b/mpesa-payment/993607`
- **e-Mola**: `https://mpesaemolatech.com/v1/c2b/emola-payment/993606`

### Credenciais do Supabase (Opcional - para Edge Functions)

#### Supabase URL
```
https://ihozrsfnfmwmrkbzpqlj.supabase.co
```

#### Supabase Anon Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlob3pyc2ZuZm13bXJrYnpwcWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDM0NDcsImV4cCI6MjA3ODUxOTQ0N30.k60F5T-nkbTDXdlWa85ogk_xTtAB35b9ZIsIvCnDgOE
```

### Variáveis de Ambiente (Opcional)

Se você quiser usar tokens diferentes por método, configure estas variáveis de ambiente na Edge Function:

- `MPESA_ACCESS_TOKEN` (opcional, usa DEFAULT_TOKEN se não configurado)
- `EMOLA_ACCESS_TOKEN` (opcional, usa DEFAULT_TOKEN se não configurado)
- `MPESA_WALLET_ID` (padrão: `993607`)
- `EMOLA_WALLET_ID` (padrão: `993606`)

---

## 🔄 Fluxo Completo do Pagamento

### 1. Inicialização do Pagamento (Frontend)

**Arquivo**: `src/pages/CheckoutPage.tsx`

O usuário:
1. Seleciona um plano de assinatura
2. Escolhe o período de pagamento (1, 3, 6 ou 12 meses)
3. Seleciona o método de pagamento (M-Pesa ou e-Mola)
4. Informa o número de telefone (9 dígitos, começando com 84, 85, 86 ou 87)
5. Preenche informações de cobrança (endereço e telefone)
6. Clica em "Pagar"

### 2. Validações no Frontend

**Arquivo**: `src/utils/paymentApi.ts`

Antes de enviar a requisição, o sistema valida:

```typescript
// Validação do telefone
validatePhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return /^(84|85|86|87)\d{7}$/.test(digits);
}

// Validação do valor mínimo
if (amount < 1 || isNaN(amount)) {
  return { success: false, message: 'Valor mínimo de pagamento é 1 MZN.' };
}
```

### 3. Preparação dos Dados

**Arquivo**: `src/pages/CheckoutPage.tsx` (linha 148-186)

```typescript
// 1. Garantir que conta seja BUSINESS
const businessId = await ensureBusinessAccount(user.id);

// 2. Gerar referência única
const reference = `AgenCode-${Date.now()}`;

// 3. Limpar número de telefone (remover caracteres não numéricos e código do país)
let phoneDigits = paymentPhone.replace(/\D/g, '');
if (phoneDigits.startsWith('258')) {
  phoneDigits = phoneDigits.substring(3);
} else if (phoneDigits.startsWith('00258')) {
  phoneDigits = phoneDigits.substring(5);
}
// Resultado: 9 dígitos (ex: 841234567)
```

### 4. Chamada para Edge Function

**Arquivo**: `src/utils/paymentApi.ts` (linha 114-123)

```typescript
const SUPABASE_URL = 'https://ihozrsfnfmwmrkbzpqlj.supabase.co';
const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/process-payment`;

const response = await fetch(edgeFunctionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': anonKey,
    'Authorization': `Bearer ${accessToken}`, // Opcional, se usuário estiver logado
  },
  body: JSON.stringify({
    amount: Number(amount),
    phone: phoneDigits, // 9 dígitos
    method: 'mpesa' | 'emola',
    reference: cleanReference, // Máximo 20 caracteres, apenas alfanuméricos e underscore
  }),
});
```

### 5. Processamento na Edge Function

**Arquivo**: `supabase/functions/process-payment/index.ts`

A Edge Function:
1. Valida os dados recebidos
2. Limpa e formata o telefone
3. Obtém as credenciais (token e wallet ID)
4. Monta a URL da API
5. Faz a requisição para a API do e-Mola/M-Pesa Tech
6. Retorna a resposta formatada

**Código Principal** (linhas 212-227):

```typescript
// Obter credenciais
const accessToken = Deno.env.get(`${method.toUpperCase()}_ACCESS_TOKEN`) || DEFAULT_TOKEN;
const walletId = method === 'mpesa' 
  ? (Deno.env.get('MPESA_WALLET_ID') || '993607')
  : (Deno.env.get('EMOLA_WALLET_ID') || '993606');

// Montar URL da API
const apiUrl = `https://mpesaemolatech.com/v1/c2b/${method}-payment/${walletId}`;

// Payload
const requestBody = {
  client_id: '9f903862-a780-440d-8ed5-b8d8090b180e',
  amount: Number(amountNum),
  phone: phoneDigits, // 9 dígitos
  reference: cleanReference, // Máximo 20 caracteres
};

// Fazer requisição
const apiResponse = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody),
  signal: controller.signal, // Timeout de 30 segundos
});
```

### 6. Resposta da API

**Sucesso (Status 200 ou 201)**:
```json
{
  "success": true,
  "transaction_id": "123456789",
  "reference": "AgenCode-1234567890",
  "response": {
    // Resposta completa da API
  }
}
```

**Erro**:
```json
{
  "success": false,
  "message": "Mensagem de erro",
  "status": 400,
  "details": {
    // Detalhes do erro
  }
}
```

### 7. Criação da Assinatura (Após Pagamento Bem-Sucedido)

**Arquivo**: `src/pages/CheckoutPage.tsx` (linhas 194-211)

```typescript
// Calcular data de expiração
const now = new Date();
const expiresAt = addDays(now, billingPeriod * 30); // billingPeriod em meses

// Criar subscription
const subscriptionData = {
  user_id: user.id,
  plan_name: selectedPlan.name,
  price: calculatedPrice,
  is_trial: false,
  status: 'active',
  created_at: now.toISOString(),
  trial_ends_at: expiresAt.toISOString(),
};

await supabase.from('subscriptions').insert(subscriptionData);
```

### 8. Registro do Pagamento

**Arquivo**: `src/pages/CheckoutPage.tsx` (linhas 217-229)

```typescript
const paymentRecord = {
  user_id: user.id,
  amount: calculatedPrice,
  status: 'confirmed',
  payment_type: 'subscription',
  method: selectedPaymentMethod, // 'mpesa' ou 'emola'
  transaction_id: paymentResponse.transaction_id || reference,
  notes: `Pagamento da assinatura ${selectedPlan.name} - ${billingPeriod} meses`,
  payment_date: now.toISOString(),
};

await supabase.from('payments').insert(paymentRecord);
```

### 9. Atualização do Perfil

```typescript
await supabase
  .from('profiles')
  .update({
    address: form.getValues('address'),
    phone: form.getValues('phone'),
    updated_at: now.toISOString(),
  })
  .eq('id', user.id);
```

### 10. Atualização da Tabela Consolidada

```typescript
await refreshConsolidatedUserData(user.id);
```

Esta função atualiza a tabela `user_consolidated` com todas as informações do usuário, incluindo assinatura e pagamento mais recente.

### 11. Notificação por Email (Opcional)

O sistema envia um email para o administrador (`emenjoseph7@gmail.com`) com os detalhes do pagamento.

---

## 📡 Estrutura da API

### Endpoint da API e-Mola/M-Pesa Tech

**URL**: `https://mpesaemolatech.com/v1/c2b/{method}-payment/{walletId}`

**Método**: `POST`

**Headers**:
```
Authorization: Bearer {ACCESS_TOKEN}
Accept: application/json
Content-Type: application/json
```

**Body (JSON)**:
```json
{
  "client_id": "9f903862-a780-440d-8ed5-b8d8090b180e",
  "amount": 100,
  "phone": "841234567",
  "reference": "AgenCode-1234567890"
}
```

**Parâmetros**:
- `client_id` (string, obrigatório): ID do cliente
- `amount` (number, obrigatório): Valor em MZN (mínimo: 1)
- `phone` (string, obrigatório): Número de telefone com 9 dígitos (sem código do país)
- `reference` (string, obrigatório): Referência única (máximo 20 caracteres, apenas alfanuméricos e underscore)

**Resposta de Sucesso (200 ou 201)**:
```json
{
  "transaction_id": "123456789",
  "reference": "AgenCode-1234567890",
  "status": "success",
  // ... outros campos da API
}
```

**Resposta de Erro**:
```json
{
  "message": "Mensagem de erro",
  "error": "Código do erro",
  // ... outros campos
}
```

---

## 🔧 Implementação em Outro Sistema

### Opção 1: Usar a Edge Function Existente (Recomendado)

Se você quiser usar a mesma Edge Function do Supabase:

1. **Configure a URL da Edge Function**:
```typescript
const EDGE_FUNCTION_URL = 'https://ihozrsfnfmwmrkbzpqlj.supabase.co/functions/v1/process-payment';
```

2. **Faça a requisição**:
```typescript
const response = await fetch(EDGE_FUNCTION_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlob3pyc2ZuZm13bXJrYnpwcWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDM0NDcsImV4cCI6MjA3ODUxOTQ0N30.k60F5T-nkbTDXdlWa85ogk_xTtAB35b9ZIsIvCnDgOE',
  },
  body: JSON.stringify({
    amount: 100,
    phone: '841234567',
    method: 'mpesa', // ou 'emola'
    reference: 'MeuSistema-1234567890',
  }),
});

const result = await response.json();
```

### Opção 2: Implementar Diretamente (Sem Edge Function)

Se você quiser chamar a API diretamente (requer configuração de CORS no servidor):

```typescript
// ⚠️ ATENÇÃO: Isso só funciona em um ambiente servidor (Node.js, PHP, etc.)
// Não funciona diretamente no navegador devido a CORS

const CLIENT_ID = '9f903862-a780-440d-8ed5-b8d8090b180e';
const ACCESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...'; // Token completo acima
const WALLET_ID_MPESA = '993607';
const WALLET_ID_EMOLA = '993606';

async function processPayment(amount: number, phone: string, method: 'mpesa' | 'emola', reference: string) {
  // Validar telefone
  const phoneDigits = phone.replace(/\D/g, '');
  if (!/^(84|85|86|87)\d{7}$/.test(phoneDigits)) {
    throw new Error('Telefone inválido');
  }

  // Validar valor
  if (amount < 1) {
    throw new Error('Valor mínimo é 1 MZN');
  }

  // Limpar referência
  const cleanReference = reference.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20);

  // Selecionar wallet ID
  const walletId = method === 'mpesa' ? WALLET_ID_MPESA : WALLET_ID_EMOLA;

  // Montar URL
  const apiUrl = `https://mpesaemolatech.com/v1/c2b/${method}-payment/${walletId}`;

  // Fazer requisição
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      amount: Number(amount),
      phone: phoneDigits,
      reference: cleanReference,
    }),
  });

  const data = await response.json();

  if (response.ok && (response.status === 200 || response.status === 201)) {
    return {
      success: true,
      transaction_id: data.transaction_id || data.reference || data.id,
      reference: data.reference || cleanReference,
      response: data,
    };
  } else {
    return {
      success: false,
      message: data.message || data.error || data.detail || 'Erro ao processar pagamento',
      status: response.status,
      details: data,
    };
  }
}

// Exemplo de uso
try {
  const result = await processPayment(100, '841234567', 'mpesa', 'MeuSistema-1234567890');
  if (result.success) {
    console.log('Pagamento processado:', result.transaction_id);
  } else {
    console.error('Erro:', result.message);
  }
} catch (error) {
  console.error('Erro:', error.message);
}
```

### Opção 3: Criar Sua Própria Edge Function

Se você tiver seu próprio Supabase ou quiser criar uma função similar:

1. **Criar a função** (exemplo em Deno/TypeScript):

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const CLIENT_ID = '9f903862-a780-440d-8ed5-b8d8090b180e';
const DEFAULT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...'; // Token completo
const MPESA_WALLET_ID = '993607';
const EMOLA_WALLET_ID = '993606';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { amount, phone, method, reference } = await req.json();

    // Validações
    if (!['mpesa', 'emola'].includes(method)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Método inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (!/^(84|85|86|87)\d{7}$/.test(phoneDigits)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Telefone inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amountNum = Number(amount);
    if (amountNum < 1 || isNaN(amountNum)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Valor mínimo é 1 MZN' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanReference = reference.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20);
    const walletId = method === 'mpesa' ? MPESA_WALLET_ID : EMOLA_WALLET_ID;
    const accessToken = Deno.env.get(`${method.toUpperCase()}_ACCESS_TOKEN`) || DEFAULT_TOKEN;

    const apiUrl = `https://mpesaemolatech.com/v1/c2b/${method}-payment/${walletId}`;

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        amount: amountNum,
        phone: phoneDigits,
        reference: cleanReference,
      }),
    });

    const responseData = await apiResponse.json();

    if (apiResponse.status === 200 || apiResponse.status === 201) {
      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: responseData.transaction_id || responseData.reference || responseData.id,
          reference: responseData.reference || cleanReference,
          response: responseData,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: responseData.message || responseData.error || 'Erro ao processar pagamento',
          status: apiResponse.status,
          details: responseData,
        }),
        { status: apiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Erro ao processar pagamento',
        status: 500,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

2. **Deploy da função**:
```bash
supabase functions deploy process-payment
```

---

## ✅ Validações e Regras de Negócio

### Validação de Telefone

- **Formato**: Exatamente 9 dígitos
- **Prefixos válidos**: 84, 85, 86, 87
- **Regex**: `/^(84|85|86|87)\d{7}$/`
- **Exemplos válidos**:
  - `841234567`
  - `855253617`
  - `861234567`
  - `871234567`
- **Exemplos inválidos**:
  - `831234567` (prefixo inválido)
  - `84123456` (menos de 9 dígitos)
  - `8412345678` (mais de 9 dígitos)
  - `+258841234567` (deve remover código do país antes de enviar)

### Validação de Valor

- **Mínimo**: 1 MZN
- **Tipo**: Número (integer ou float)
- **Validação**: `amount >= 1 && !isNaN(amount)`

### Validação de Referência

- **Comprimento máximo**: 20 caracteres
- **Caracteres permitidos**: Letras (a-z, A-Z), números (0-9) e underscore (_)
- **Caracteres removidos**: Espaços, hífens, caracteres especiais
- **Formato sugerido**: `{Sistema}-{Timestamp}` (ex: `AgenCode-1234567890`)

### Validação de Método

- **Valores aceitos**: `'mpesa'` ou `'emola'`
- **Case-sensitive**: Sim (deve ser minúsculo)

### Limpeza de Dados

**Telefone**:
```typescript
// Remove caracteres não numéricos
let phoneDigits = phone.replace(/\D/g, '');

// Remove código do país se presente
if (phoneDigits.startsWith('258')) {
  phoneDigits = phoneDigits.substring(3);
} else if (phoneDigits.startsWith('00258')) {
  phoneDigits = phoneDigits.substring(5);
}

// Resultado: 9 dígitos
```

**Referência**:
```typescript
// Remove caracteres especiais e limita a 20 caracteres
const cleanReference = reference
  .replace(/[^a-zA-Z0-9_]/g, '')
  .substring(0, 20);

// Se vazio, gera uma referência padrão
if (!cleanReference) {
  cleanReference = `order_${Date.now()}`;
}
```

---

## ⚠️ Tratamento de Erros

### Erros Comuns e Soluções

#### 1. Telefone Inválido
**Erro**: `"Número de telefone inválido"`
**Solução**: Verificar se o telefone tem 9 dígitos e começa com 84, 85, 86 ou 87

#### 2. Valor Mínimo
**Erro**: `"Valor mínimo de pagamento é 1 MZN"`
**Solução**: Garantir que o valor seja >= 1

#### 3. Timeout
**Erro**: `"Tempo de espera excedido"`
**Solução**: A API pode estar lenta. Tentar novamente após alguns segundos

#### 4. CORS (Cross-Origin Resource Sharing)
**Erro**: `"CORS policy: No 'Access-Control-Allow-Origin' header"`
**Solução**: Usar uma Edge Function ou servidor intermediário (não chamar a API diretamente do navegador)

#### 5. Token Expirado
**Erro**: `"Unauthorized"` ou `"Invalid token"`
**Solução**: Verificar se o ACCESS_TOKEN está válido. O token padrão expira em 2026.

#### 6. Wallet ID Inválido
**Erro**: `"Wallet not found"` ou `"Invalid wallet"`
**Solução**: Verificar se está usando o wallet ID correto:
- M-Pesa: `993607`
- e-Mola: `993606`

### Códigos de Status HTTP

- **200/201**: Sucesso
- **400**: Erro de validação (dados inválidos)
- **401**: Não autorizado (token inválido)
- **408**: Timeout
- **500**: Erro interno do servidor

### Estrutura de Resposta de Erro

```typescript
{
  success: false,
  message: "Mensagem de erro legível",
  status: 400,
  details: {
    // Informações adicionais sobre o erro
    missingFields?: string[],
    receivedPhone?: string,
    validFormat?: string,
    // ... outros campos específicos
  }
}
```

---

## 🎉 Aprovação da Conta Após Pagamento

### Fluxo de Aprovação Automática

Após um pagamento bem-sucedido, o sistema automaticamente:

1. **Cria a Assinatura** (Status: `active`)
   ```typescript
   {
     user_id: user.id,
     plan_name: selectedPlan.name,
     price: calculatedPrice,
     is_trial: false,
     status: 'active',
     created_at: now.toISOString(),
     trial_ends_at: expiresAt.toISOString(), // Data de expiração baseada no período
   }
   ```

2. **Registra o Pagamento** (Status: `confirmed`)
   ```typescript
   {
     user_id: user.id,
     amount: calculatedPrice,
     status: 'confirmed',
     payment_type: 'subscription',
     method: 'mpesa' | 'emola',
     transaction_id: paymentResponse.transaction_id,
     payment_date: now.toISOString(),
   }
   ```

3. **Ativa a Conta BUSINESS**
   - Garante que o usuário tenha uma conta BUSINESS ativa
   - Função: `ensureBusinessAccount(user.id)`

4. **Atualiza o Perfil**
   - Salva endereço e telefone do usuário

5. **Atualiza Tabela Consolidada**
   - Atualiza `user_consolidated` com todas as informações
   - Função: `refreshConsolidatedUserData(user.id)`

6. **Redireciona para Dashboard**
   - Após 2 segundos, redireciona o usuário para `/dashboard`
   - Mostra mensagem de sucesso: "Pagamento confirmado! Sua conta foi ativada."

### Verificação de Status da Assinatura

O sistema verifica o status da assinatura em várias partes:

- **Dashboard**: Mostra informações da assinatura ativa
- **Tabela `subscriptions`**: Contém todas as assinaturas do usuário
- **Tabela `user_consolidated`**: Contém a assinatura mais recente consolidada

### Expiração da Assinatura

A data de expiração é calculada baseada no período selecionado:

```typescript
const expiresAt = addDays(now, billingPeriod * 30);
```

- **1 mês**: 30 dias
- **3 meses**: 90 dias
- **6 meses**: 180 dias
- **12 meses**: 360 dias

### Renovação Manual

Atualmente, o sistema não renova automaticamente. O usuário precisa fazer um novo pagamento quando a assinatura expirar.

### Aprovação Manual pelo Admin (Opcional)

Se você quiser adicionar aprovação manual, pode modificar o status do pagamento na tabela `payments`:

**Arquivo**: `src/pages/AdminPaymentsPage.tsx` (linhas 218-249)

```typescript
// Atualizar status do pagamento
await supabase
  .from('payments')
  .update({ status: 'confirmed' })
  .eq('id', payment.id);

// Se o pagamento for confirmado e for de assinatura, atualiza a subscrição
if (newStatus === 'confirmed' && payment.payment_type === 'subscription') {
  await supabase
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('user_id', payment.user_id);
}
```

---

## 📝 Exemplo Completo de Implementação

### Frontend (React/TypeScript)

```typescript
import { useState } from 'react';

interface PaymentRequest {
  amount: number;
  phone: string;
  method: 'mpesa' | 'emola';
  reference: string;
}

interface PaymentResponse {
  success: boolean;
  message?: string;
  transaction_id?: string;
  reference?: string;
  status?: number;
}

function validatePhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return /^(84|85|86|87)\d{7}$/.test(digits);
}

async function processPayment(request: PaymentRequest): Promise<PaymentResponse> {
  // Validar telefone
  if (!validatePhoneNumber(request.phone)) {
    return {
      success: false,
      message: 'Número de telefone inválido. Use um número válido de Moçambique (84, 85, 86, 87).',
      status: 400,
    };
  }

  // Validar valor
  const amount = Number(request.amount);
  if (amount < 1 || isNaN(amount)) {
    return {
      success: false,
      message: 'Valor mínimo de pagamento é 1 MZN.',
      status: 400,
    };
  }

  // Limpar telefone
  let phoneDigits = request.phone.replace(/\D/g, '');
  if (phoneDigits.startsWith('258')) {
    phoneDigits = phoneDigits.substring(3);
  } else if (phoneDigits.startsWith('00258')) {
    phoneDigits = phoneDigits.substring(5);
  }

  // Limpar referência
  let cleanReference = request.reference
    .replace(/[^a-zA-Z0-9_]/g, '')
    .substring(0, 20);
  
  if (!cleanReference) {
    cleanReference = `Payment-${Date.now()}`;
  }

  // Chamar Edge Function
  const EDGE_FUNCTION_URL = 'https://ihozrsfnfmwmrkbzpqlj.supabase.co/functions/v1/process-payment';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlob3pyc2ZuZm13bXJrYnpwcWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDM0NDcsImV4cCI6MjA3ODUxOTQ0N30.k60F5T-nkbTDXdlWa85ogk_xTtAB35b9ZIsIvCnDgOE';

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        amount: amount,
        phone: phoneDigits,
        method: request.method,
        reference: cleanReference,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        transaction_id: data.transaction_id,
        reference: data.reference || cleanReference,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Erro ao processar pagamento',
        status: data.status || response.status,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Erro de conexão',
      status: 0,
    };
  }
}

// Componente React
function PaymentForm() {
  const [amount, setAmount] = useState(100);
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<'mpesa' | 'emola'>('mpesa');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const reference = `Payment-${Date.now()}`;
    const response = await processPayment({ amount, phone, method, reference });
    
    setResult(response);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Valor (MZN)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          min="1"
          required
        />
      </div>

      <div>
        <label>Telefone (9 dígitos)</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="841234567"
          maxLength={9}
          required
        />
        {phone && !validatePhoneNumber(phone) && (
          <p style={{ color: 'red' }}>Telefone inválido. Use 84, 85, 86 ou 87.</p>
        )}
      </div>

      <div>
        <label>Método</label>
        <select value={method} onChange={(e) => setMethod(e.target.value as 'mpesa' | 'emola')}>
          <option value="mpesa">M-Pesa</option>
          <option value="emola">e-Mola</option>
        </select>
      </div>

      <button type="submit" disabled={loading || !validatePhoneNumber(phone)}>
        {loading ? 'Processando...' : 'Pagar'}
      </button>

      {result && (
        <div>
          {result.success ? (
            <p style={{ color: 'green' }}>
              Sucesso! Transaction ID: {result.transaction_id}
            </p>
          ) : (
            <p style={{ color: 'red' }}>Erro: {result.message}</p>
          )}
        </div>
      )}
    </form>
  );
}
```

### Backend (Node.js/Express)

```javascript
const express = require('express');
const app = express();
app.use(express.json());

const CLIENT_ID = '9f903862-a780-440d-8ed5-b8d8090b180e';
const ACCESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...'; // Token completo
const MPESA_WALLET_ID = '993607';
const EMOLA_WALLET_ID = '993606';

app.post('/api/payment', async (req, res) => {
  try {
    const { amount, phone, method, reference } = req.body;

    // Validações
    if (!['mpesa', 'emola'].includes(method)) {
      return res.status(400).json({ success: false, message: 'Método inválido' });
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (!/^(84|85|86|87)\d{7}$/.test(phoneDigits)) {
      return res.status(400).json({ success: false, message: 'Telefone inválido' });
    }

    const amountNum = Number(amount);
    if (amountNum < 1 || isNaN(amountNum)) {
      return res.status(400).json({ success: false, message: 'Valor mínimo é 1 MZN' });
    }

    const cleanReference = reference.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20);
    const walletId = method === 'mpesa' ? MPESA_WALLET_ID : EMOLA_WALLET_ID;

    // Chamar API
    const apiUrl = `https://mpesaemolatech.com/v1/c2b/${method}-payment/${walletId}`;
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        amount: amountNum,
        phone: phoneDigits,
        reference: cleanReference,
      }),
    });

    const data = await apiResponse.json();

    if (apiResponse.status === 200 || apiResponse.status === 201) {
      res.json({
        success: true,
        transaction_id: data.transaction_id || data.reference || data.id,
        reference: data.reference || cleanReference,
        response: data,
      });
    } else {
      res.status(apiResponse.status).json({
        success: false,
        message: data.message || data.error || 'Erro ao processar pagamento',
        status: apiResponse.status,
        details: data,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao processar pagamento',
      status: 500,
    });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
```

---

## 🔒 Segurança

### Boas Práticas

1. **Nunca exponha credenciais no frontend**
   - Use uma Edge Function ou servidor intermediário
   - Armazene tokens em variáveis de ambiente

2. **Valide todos os dados no servidor**
   - Não confie apenas na validação do frontend

3. **Use HTTPS**
   - Sempre use conexões seguras em produção

4. **Limite tentativas**
   - Implemente rate limiting para evitar abuso

5. **Registre transações**
   - Mantenha logs de todas as transações para auditoria

---

## 📞 Suporte

Para questões sobre a API do e-Mola/M-Pesa Tech, consulte a documentação oficial ou entre em contato com o suporte do provedor.

---

## 📅 Última Atualização

Este documento foi criado em: **Janeiro 2025**

**Versão**: 1.0

---

## ✅ Checklist de Implementação

- [ ] Configurar credenciais (CLIENT_ID, ACCESS_TOKEN, WALLET_IDs)
- [ ] Implementar validação de telefone
- [ ] Implementar validação de valor
- [ ] Implementar limpeza de dados (telefone e referência)
- [ ] Configurar Edge Function ou servidor intermediário
- [ ] Implementar tratamento de erros
- [ ] Testar com valores diferentes
- [ ] Testar com diferentes números de telefone
- [ ] Implementar registro de transações no banco de dados
- [ ] Implementar aprovação automática da conta após pagamento
- [ ] Configurar notificações (email, push, etc.)
- [ ] Implementar logs e auditoria

---

## 🔗 Webhooks do Sistema

O sistema utiliza webhooks para notificar serviços externos sobre eventos importantes, como a criação de agendamentos.

### Webhooks Configurados

#### 1. Webhook Principal de Agendamentos
**URL**: `https://n8n.ejss.space/webhook/agencodes`

**Método**: `POST`

**Content-Type**: `application/json`

**Payload**:
```json
{
  "appointment_id": "uuid",
  "business_id": "uuid",
  "business_name": "Nome do Negócio",
  "business_phone": "841234567",
  "business_whatsapp": "841234567",
  "service_id": "uuid",
  "service_name": "Nome do Serviço",
  "service_duration": 60,
  "service_price": 500,
  "client_name": "Nome do Cliente",
  "client_whatsapp": "841234567",
  "client_email": "cliente@email.com",
  "client_code": "ABC123",
  "start_time": "2025-01-15T10:00:00.000Z",
  "end_time": "2025-01-15T11:00:00.000Z",
  "formatted_date": "15/01/2025",
  "formatted_time": "10:00",
  "status": "pending",
  "created_at": "2025-01-15T09:00:00.000Z"
}
```

#### 2. Webhook Secundário de Agendamentos
**URL**: `https://n8n.ejss.space/webhook/agencodess`

**Método**: `POST`

**Content-Type**: `application/json`

**Payload**: Mesmo formato do webhook principal

### Implementação

Os webhooks são enviados automaticamente quando um agendamento é criado com sucesso. O sistema tenta enviar para ambos os webhooks, mas não bloqueia o fluxo se algum falhar.

**Arquivo**: `src/pages/BookingPage.tsx` (linhas 1107-1149)

```typescript
// Enviar dados para os webhooks
try {
  const webhookPayload = {
    appointment_id: createdAppointment.id,
    business_id: business.id,
    // ... outros campos
  };

  // Webhook 1
  await fetch('https://n8n.ejss.space/webhook/agencodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload),
  });

  // Webhook 2
  await fetch('https://n8n.ejss.space/webhook/agencodess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload),
  });
} catch (error) {
  // Não bloqueia o fluxo se o webhook falhar
  console.error('Erro ao enviar webhooks:', error);
}
```

### Tratamento de Erros

- Os webhooks são enviados de forma **não bloqueante**
- Se um webhook falhar, o sistema continua normalmente
- Erros são registrados no console para debug
- Ambos os webhooks recebem o mesmo payload

### Notas Importantes

- Os webhooks são enviados **após** a criação bem-sucedida do agendamento no banco de dados
- O sistema não aguarda resposta dos webhooks para continuar o fluxo
- Os webhooks são independentes e podem ser configurados para diferentes propósitos (notificações, integrações, etc.)

---

**Fim do Documento**


