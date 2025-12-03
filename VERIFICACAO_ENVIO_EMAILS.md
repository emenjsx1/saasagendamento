# 📧 Verificação e Configuração do Envio de Emails

## ✅ Melhorias Implementadas

### 1. Edge Function (`supabase/functions/send-email/index.ts`)
- ✅ Validação melhorada de campos obrigatórios
- ✅ Validação de formato de email
- ✅ Tratamento de erros mais detalhado
- ✅ Logs mais informativos para debug
- ✅ Melhor tratamento de respostas da API Resend
- ✅ Validação da chave API do Resend

### 2. Hook de Notificações (`src/hooks/use-email-notifications.ts`)
- ✅ Validação de payload antes de enviar
- ✅ Melhor tratamento de erros com mensagens descritivas
- ✅ Logs detalhados para debug
- ✅ Retorno de resultado para permitir tratamento pelo chamador

## 🔧 Configuração Necessária

### 1. Variável de Ambiente no Supabase

A variável `RESEND_API_KEY` **DEVE** estar configurada no Supabase:

1. Acesse o Dashboard do Supabase: https://app.supabase.com
2. Vá para **Edge Functions** → **send-email** → **Settings**
3. Na seção **Secrets**, adicione:
   - **Nome**: `RESEND_API_KEY`
   - **Valor**: Sua chave API do Resend

**OU** via CLI:
```bash
supabase secrets set RESEND_API_KEY=sua_chave_aqui
```

### 2. Verificar JWT Verification

Para evitar problemas de CORS:

1. No Dashboard do Supabase, vá para **Edge Functions** → **send-email** → **Settings**
2. Verifique a opção **"Verify JWT"**
   - Se estiver habilitada, pode causar problemas de CORS
   - Recomenda-se desabilitar (toggle OFF) se houver problemas

## 🧪 Como Testar

### 1. Verificar Logs da Edge Function

1. Acesse o Dashboard do Supabase
2. Vá para **Edge Functions** → **send-email** → **Logs**
3. Procure por:
   - ✅ `📧 Enviando email:` - Email sendo enviado
   - ✅ `✅ Email enviado com sucesso:` - Email enviado com sucesso
   - ❌ `❌ RESEND_API_KEY não configurada` - Chave não configurada
   - ❌ `❌ Resend API Error:` - Erro da API Resend
   - ❌ `❌ Function Error:` - Erro geral

### 2. Verificar Console do Navegador

Abra o DevTools (F12) e procure por:
- ✅ `📧 Enviando email:` - Tentativa de envio
- ✅ `✅ Email enviado com sucesso:` - Sucesso
- ❌ `❌ Erro ao enviar notificação por email:` - Erro no frontend
- ⚠️ `⚠️ Não é possível enviar email: sessão do usuário não encontrada` - Problema de autenticação

### 3. Testar Manualmente

Você pode testar a função diretamente via curl:

```bash
curl -X POST https://ihozrsfnfmwmrkbzpqlj.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{
    "to": "teste@exemplo.com",
    "subject": "Teste",
    "body": "<h1>Teste de Email</h1>"
  }'
```

## 🔍 Problemas Comuns e Soluções

### Problema 1: "RESEND_API_KEY not configured"
**Solução**: Configure a variável de ambiente no Supabase (veja seção acima)

### Problema 2: "Sessão do usuário não encontrada"
**Solução**: 
- Verifique se o usuário está logado
- Verifique se o token de sessão é válido
- Recarregue a página e tente novamente

### Problema 3: "Resend API failed"
**Soluções**:
- Verifique se a chave API do Resend está correta
- Verifique se o domínio `mozcodes.space` está verificado no Resend
- Verifique os logs da API Resend no dashboard do Resend

### Problema 4: Erro de CORS
**Solução**:
- Desabilite JWT Verification na Edge Function (veja seção acima)
- Verifique se os headers CORS estão corretos

### Problema 5: Email não chega
**Soluções**:
- Verifique a pasta de spam
- Verifique se o email de destino está correto
- Verifique os logs do Resend no dashboard
- Verifique se o domínio está verificado no Resend

## 📊 Monitoramento

### Logs Importantes

**Edge Function:**
- `📧 Enviando email:` - Início do processo
- `✅ Email enviado com sucesso:` - Sucesso
- `❌` - Qualquer erro

**Frontend:**
- `📧 Enviando email:` - Tentativa de envio
- `✅ Email enviado com sucesso:` - Sucesso
- `❌ Erro ao enviar notificação por email:` - Erro

### Métricas a Observar

1. **Taxa de sucesso**: Verifique quantos emails são enviados com sucesso
2. **Erros comuns**: Identifique padrões nos erros
3. **Tempo de resposta**: Monitore o tempo de resposta da API Resend

## 🚀 Próximos Passos

1. ✅ Configurar `RESEND_API_KEY` no Supabase
2. ✅ Verificar se os emails estão sendo enviados (verificar logs)
3. ✅ Testar envio de email em diferentes cenários:
   - Registro de novo usuário
   - Confirmação de agendamento
   - Cancelamento de agendamento
   - Notificações administrativas
4. ✅ Monitorar logs por alguns dias para identificar problemas

## 📝 Notas

- Os emails de boas-vindas são enviados de forma assíncrona e não bloqueiam o registro se falharem
- Erros são logados mas não interrompem o fluxo principal da aplicação
- A função rastreia o uso de emails para controle de limites do plano

