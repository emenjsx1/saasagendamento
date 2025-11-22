# 🔧 Solução para Erro de CORS na Edge Function `process-payment`

## ⚠️ Problema

O erro `Response to preflight request doesn't pass access control check: It does not have HTTP ok status` ocorre porque o **Supabase está bloqueando a requisição OPTIONS antes que a função seja executada**, devido à **verificação JWT habilitada**.

## ✅ Solução: Desabilitar Verificação JWT para esta função

### Método 1: Via Dashboard do Supabase (Recomendado)

1. **Acesse o Dashboard do Supabase**
   - Vá para [https://app.supabase.com](https://app.supabase.com)
   - Faça login e selecione seu projeto

2. **Vá para Edge Functions**
   - No menu lateral, clique em **"Edge Functions"**
   - Clique na função **`process-payment`**

3. **Desabilitar Verificação JWT**
   - Vá para a aba **"Settings"** (Configurações)
   - Encontre a opção **"Verify JWT"** ou **"JWT Verification"**
   - **Desabilite** (toggle OFF) essa opção
   - Clique em **"Save"** ou **"Update"**

### Método 2: Via CLI do Supabase

Se você tem o Supabase CLI configurado, você pode fazer o deploy sem verificação JWT:

```bash
# Deploy sem verificação JWT
supabase functions deploy process-payment --no-verify-jwt
```

**OU** criar um arquivo de configuração:

1. Crie o arquivo: `supabase/config.toml` (se não existir)
2. Adicione:

```toml
[functions.process-payment]
verify_jwt = false
```

3. Faça o deploy:
```bash
supabase functions deploy process-payment
```

### Método 3: Usar anon key diretamente (alternativa)

Se você não puder desabilitar JWT, você pode usar a `anon key` diretamente na chamada. A Edge Function já aceita a `anon key` no header `apikey`, então isso deve funcionar mesmo com JWT habilitado.

## 📋 Verificar se funcionou

Após desabilitar JWT verification:

1. **Teste a requisição OPTIONS**:
   ```bash
   curl -X OPTIONS https://ihozrsfnfmwmrkbzpqlj.supabase.co/functions/v1/process-payment \
     -H "Origin: http://localhost:8080" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```

   Deve retornar **204 No Content** com headers CORS.

2. **Teste no navegador**:
   - Tente fazer um pagamento novamente
   - O erro de CORS deve desaparecer

## 🔍 Como verificar se JWT está desabilitado

1. Dashboard → Edge Functions → `process-payment` → Settings
2. A opção "Verify JWT" deve estar **OFF** (desabilitada)

## 🚨 Segurança

⚠️ **Nota de Segurança**: Desabilitar JWT verification permite que qualquer pessoa chame a função. No entanto, a função `process-payment` tem validações internas e não expõe dados sensíveis. Para maior segurança:

- Use rate limiting no Supabase
- Valide os dados de entrada rigorosamente (já está implementado)
- Monitore os logs da função

## ✅ Após resolver

Depois que o CORS estiver funcionando, a função deve processar pagamentos normalmente. A Edge Function já está configurada para:
- Aceitar requisições de qualquer origem (`*`)
- Validar número de telefone
- Validar valor mínimo
- Retornar respostas formatadas

## 📞 Suporte

Se o problema persistir após desabilitar JWT verification:
1. Verifique os logs da função no Dashboard
2. Teste a função diretamente via curl/Postman
3. Verifique se a função foi deployada corretamente

