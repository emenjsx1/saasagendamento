# 📡 Guia de Integração: Sistema de Lembretes com n8n

Este documento descreve como configurar o workflow no n8n para receber e processar lembretes do sistema AgenCodes.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Webhook Endpoint](#webhook-endpoint)
3. [Payload do Webhook](#payload-do-webhook)
4. [Configuração do Workflow n8n](#configuração-do-workflow-n8n)
5. [Envio via WhatsApp](#envio-via-whatsapp)
6. [Tratamento de Erros](#tratamento-de-erros)
7. [Testes](#testes)

---

## 🎯 Visão Geral

O sistema de lembretes do AgenCodes envia notificações para o n8n através de um webhook. O n8n processa essas notificações e envia mensagens via WhatsApp para os clientes.

**Fluxo:**
```
AgenCodes → Webhook n8n → Processamento → WhatsApp Business API → Cliente
```

---

## 🔗 Webhook Endpoint

**URL do Webhook:**
```
https://n8n.ejss.space/webhook-test/lembrete
```

**Método:** `POST`

**Content-Type:** `application/json`

---

## 📦 Payload do Webhook

### Estrutura do Payload

```json
{
  "reminder_id": "uuid-do-lembrete",
  "business_id": "uuid-do-negocio",
  "client_id": "uuid-do-cliente",
  "appointment_id": "uuid-do-agendamento-ou-null",
  "client_name": "Nome do Cliente",
  "client_whatsapp": "841234567",
  "client_phone": "841234567",
  "client_email": "cliente@email.com",
  "reminder_type": "appointment_auto" | "custom",
  "title": "Lembrete de Agendamento",
  "message": "Você tem um agendamento em 30 minutos.",
  "send_via": "whatsapp",
  "scheduled_at": "2025-01-15T10:00:00.000Z",
  "metadata": {
    "appointment_start": "2025-01-15T10:30:00.000Z",
    "service_name": "Corte de Cabelo",
    "business_name": "Salão Exemplo"
  }
}
```

### Campos do Payload

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `reminder_id` | string (UUID) | ID único do lembrete |
| `business_id` | string (UUID) | ID do negócio |
| `client_id` | string (UUID) \| null | ID do cliente (null se não linkado) |
| `appointment_id` | string (UUID) \| null | ID do agendamento (null para lembretes personalizados) |
| `client_name` | string | Nome do cliente |
| `client_whatsapp` | string \| null | Número do WhatsApp do cliente |
| `client_phone` | string \| null | Número de telefone do cliente |
| `client_email` | string \| null | Email do cliente |
| `reminder_type` | string | Tipo: `appointment_auto` (automático) ou `custom` (personalizado) |
| `title` | string | Título do lembrete |
| `message` | string | Mensagem a ser enviada |
| `send_via` | string | Canal: `whatsapp`, `sms`, ou `email` |
| `scheduled_at` | string (ISO 8601) | Data/hora programada para envio |
| `metadata` | object | Dados adicionais (opcional) |

### Tipos de Lembretes

#### 1. Lembrete Automático (`appointment_auto`)
- Criado automaticamente quando um agendamento é confirmado
- Enviado em 3 momentos: 1 dia antes, 1 hora antes, 30 minutos antes
- Contém `appointment_id` e informações do agendamento

#### 2. Lembrete Personalizado (`custom`)
- Criado manualmente pelo dono do negócio
- Pode ser agendado para qualquer data/hora
- Não está vinculado a um agendamento específico

---

## ⚙️ Configuração do Workflow n8n

### Passo 1: Criar Webhook Node

1. Adicione um nó **Webhook** ao workflow
2. Configure:
   - **HTTP Method:** `POST`
   - **Path:** `/webhook/reminders`
   - **Response Mode:** `Last Node`
   - **Authentication:** Nenhuma (ou configure conforme necessário)

### Passo 2: Validar Payload (Opcional)

Adicione um nó **IF** para validar campos obrigatórios:

```javascript
// Exemplo de validação
if (!$json.client_whatsapp && !$json.client_phone) {
  return { error: "Nenhum número de telefone disponível" };
}
```

### Passo 3: Formatar Mensagem

Adicione um nó **Code** ou **Set** para formatar a mensagem final:

```javascript
// Exemplo de formatação
const message = `
*${$json.title}*

${$json.message}

${$json.metadata?.business_name ? `\n_${$json.metadata.business_name}_` : ''}
`;

return {
  phone: $json.client_whatsapp || $json.client_phone,
  message: message.trim()
};
```

### Passo 4: Enviar via WhatsApp

Configure o nó do WhatsApp Business API:

- **API:** WhatsApp Business API (ou serviço de terceiros)
- **To:** `{{ $json.phone }}`
- **Message:** `{{ $json.message }}`

**Exemplo com WhatsApp Business API:**
```
POST https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages
Headers:
  Authorization: Bearer {ACCESS_TOKEN}
  Content-Type: application/json
Body:
{
  "messaging_product": "whatsapp",
  "to": "{{ $json.phone }}",
  "type": "text",
  "text": {
    "body": "{{ $json.message }}"
  }
}
```

### Passo 5: Tratamento de Resposta

Adicione um nó **IF** para verificar sucesso:

```javascript
// Verificar se envio foi bem-sucedido
if ($json.response?.messages?.[0]?.id) {
  return { success: true, message_id: $json.response.messages[0].id };
} else {
  return { success: false, error: $json.error };
}
```

### Passo 6: Retornar Resposta

Configure o nó final para retornar status:

```json
{
  "success": true,
  "reminder_id": "{{ $('Webhook').item.json.reminder_id }}",
  "sent_at": "{{ $now }}"
}
```

---

## 📱 Envio via WhatsApp

### Opção 1: WhatsApp Business API (Oficial)

**Requisitos:**
- Conta Meta Business
- Número de telefone verificado
- Access Token

**Configuração:**
1. Obtenha o `PHONE_NUMBER_ID` e `ACCESS_TOKEN` do Meta Business
2. Configure o nó HTTP Request no n8n:
   - **Method:** `POST`
   - **URL:** `https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages`
   - **Headers:**
     - `Authorization: Bearer {ACCESS_TOKEN}`
     - `Content-Type: application/json`
   - **Body:**
     ```json
     {
       "messaging_product": "whatsapp",
       "to": "{{ $json.phone }}",
       "type": "text",
       "text": {
         "body": "{{ $json.message }}"
       }
     }
     ```

### Opção 2: Serviço de Terceiros

**Exemplos:**
- Twilio WhatsApp API
- MessageBird
- ChatAPI
- Evolution API

Configure conforme a documentação do serviço escolhido.

---

## ⚠️ Tratamento de Erros

### Erros Comuns

1. **Número inválido:**
   ```json
   {
     "error": "Invalid phone number",
     "reminder_id": "..."
   }
   ```

2. **WhatsApp não disponível:**
   ```json
   {
     "error": "WhatsApp not available for this number",
     "reminder_id": "..."
   }
   ```

3. **Rate limit:**
   ```json
   {
     "error": "Rate limit exceeded",
     "retry_after": 60
   }
   ```

### Retry Logic (Opcional)

Adicione um nó **Wait** e **Retry** para tentativas automáticas:

```javascript
// Exemplo de retry
if ($json.error && $json.error.includes("rate limit")) {
  return { retry: true, wait_seconds: $json.retry_after || 60 };
}
```

---

## 🧪 Testes

### Teste Manual via cURL

```bash
curl -X POST https://n8n.ejss.space/webhook/reminders \
  -H "Content-Type: application/json" \
  -d '{
    "reminder_id": "test-123",
    "business_id": "test-business",
    "client_id": "test-client",
    "appointment_id": null,
    "client_name": "Cliente Teste",
    "client_whatsapp": "841234567",
    "client_phone": "841234567",
    "client_email": "teste@email.com",
    "reminder_type": "custom",
    "title": "Teste de Lembrete",
    "message": "Esta é uma mensagem de teste.",
    "send_via": "whatsapp",
    "scheduled_at": "2025-01-15T10:00:00.000Z",
    "metadata": {}
  }'
```

### Teste no n8n

1. Ative o workflow no n8n
2. Use o botão "Test workflow" no nó Webhook
3. Envie um payload de teste
4. Verifique se a mensagem foi enviada ao WhatsApp

---

## 📊 Monitoramento

### Logs Recomendados

1. **Log de recebimento:**
   - Timestamp
   - `reminder_id`
   - `client_name`
   - `reminder_type`

2. **Log de envio:**
   - Timestamp
   - `reminder_id`
   - `phone`
   - Status (sucesso/falha)
   - `message_id` (se disponível)

3. **Log de erros:**
   - Timestamp
   - `reminder_id`
   - Tipo de erro
   - Detalhes do erro

---

## 🔄 Processamento Automático

O sistema AgenCodes possui uma Edge Function que processa lembretes pendentes automaticamente:

**Edge Function:** `process-reminders`

**Como funciona:**
1. Busca lembretes com `status = 'pending'` e `scheduled_at <= NOW()`
2. Envia cada lembrete para o webhook n8n
3. Atualiza status para `'sent'` ou `'failed'`

**Execução:**
- Manual: Chamar a função via API
- Automática: Configurar cron job (recomendado a cada 5 minutos)

**Exemplo de chamada:**
```bash
curl -X POST https://{SUPABASE_PROJECT}.supabase.co/functions/v1/process-reminders \
  -H "Authorization: Bearer {ANON_KEY}"
```

---

## 📝 Notas Importantes

1. **Formato de Telefone:**
   - Use formato internacional sem "+" (ex: `841234567` para Moçambique)
   - Valide o formato antes de enviar

2. **Horário de Envio:**
   - Respeite horários comerciais (opcional)
   - Evite enviar em horários muito cedo ou muito tarde

3. **Personalização:**
   - Use variáveis do payload para personalizar mensagens
   - Inclua nome do cliente, nome do negócio, etc.

4. **Compliance:**
   - Obtenha consentimento do cliente antes de enviar
   - Forneça opção de opt-out
   - Respeite regulamentações locais (LGPD, GDPR, etc.)

---

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do n8n
2. Verifique os logs do AgenCodes (Edge Function)
3. Teste o webhook manualmente
4. Entre em contato com o suporte técnico

---

**Última atualização:** 15/01/2025

