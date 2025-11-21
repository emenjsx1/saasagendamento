# 📦 Como Criar o Bucket user_avatars no Supabase

## Método 1: Via SQL Editor (Recomendado)

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor** no menu lateral
3. Copie e cole o conteúdo do arquivo `supabase/migrations/create_user_avatars_bucket.sql`
4. Clique em **Run** ou pressione `Ctrl+Enter`
5. Verifique se o bucket foi criado com sucesso

## Método 2: Via Interface do Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **Storage** no menu lateral
3. Clique em **New bucket**
4. Preencha os campos:
   - **Name**: `user_avatars`
   - **Public bucket**: ✅ Marque como público
   - **File size limit**: `5 MB` (opcional)
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif` (opcional)
5. Clique em **Create bucket**

## Verificar se o Bucket foi Criado

Execute esta query no SQL Editor:

```sql
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id = 'user_avatars';
```

Se retornar uma linha, o bucket foi criado com sucesso! ✅

## Políticas RLS (Row Level Security)

O script SQL também cria automaticamente as políticas de segurança:
- ✅ Usuários podem fazer upload de seus próprios avatares
- ✅ Usuários podem atualizar seus próprios avatares
- ✅ Usuários podem deletar seus próprios avatares
- ✅ Todos podem visualizar avatares (bucket público)

## Próximos Passos

Após criar o bucket, você poderá:
- ✅ Fazer upload de fotos de perfil na página de perfil
- ✅ As fotos serão armazenadas em `user_avatars/{user_id}/avatar.jpg`
- ✅ As URLs públicas estarão disponíveis automaticamente

