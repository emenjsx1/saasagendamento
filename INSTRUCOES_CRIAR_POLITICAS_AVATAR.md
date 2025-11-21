# 🔐 Como Criar Políticas RLS para o Bucket user_avatars

## ⚠️ Problema
Se você recebeu o erro "must be owner of table objects", significa que não tem permissões de superuser para criar políticas diretamente via SQL.

## ✅ Solução: Usar o Dashboard do Supabase

### Método 1: Via Dashboard (Recomendado)

1. Acesse o **Supabase Dashboard**
2. Vá em **Storage** → **Policies**
3. Selecione o bucket **user_avatars**
4. Clique em **New Policy**

#### Criar as seguintes políticas:

**1. Política de Upload (INSERT)**
- Policy Name: `Users can upload their own avatars`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- USING expression: (deixe vazio)
- WITH CHECK expression:
  ```sql
  bucket_id = 'user_avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  ```

**2. Política de Update (UPDATE)**
- Policy Name: `Users can update their own avatars`
- Allowed operation: `UPDATE`
- Target roles: `authenticated`
- USING expression:
  ```sql
  bucket_id = 'user_avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  ```
- WITH CHECK expression:
  ```sql
  bucket_id = 'user_avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  ```

**3. Política de Delete (DELETE)**
- Policy Name: `Users can delete their own avatars`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- USING expression:
  ```sql
  bucket_id = 'user_avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  ```

**4. Política de Visualização (SELECT)**
- Policy Name: `Anyone can view avatars`
- Allowed operation: `SELECT`
- Target roles: `public`
- USING expression:
  ```sql
  bucket_id = 'user_avatars'
  ```

### Método 2: Via SQL Editor (se tiver permissões de superuser)

Se você tiver acesso de superuser, execute:
```sql
supabase/migrations/fix_user_avatars_policies.sql
```

## 🔍 Verificar se Funcionou

Após criar as políticas, teste fazendo upload de uma foto de perfil. Se ainda houver erro, verifique:

1. O bucket está marcado como **público**?
2. As políticas foram criadas corretamente?
3. O usuário está autenticado?

## 📝 Nota Importante

O bucket `user_avatars` deve estar configurado como **público** para que as imagens sejam acessíveis. Isso não compromete a segurança, pois as políticas RLS garantem que:
- Usuários só podem fazer upload em suas próprias pastas (`{user_id}/avatar.jpg`)
- Usuários só podem modificar/deletar seus próprios arquivos
- Qualquer um pode visualizar (necessário para exibir avatares)

