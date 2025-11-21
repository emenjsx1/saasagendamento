-- ============================================
-- CRIAR BUCKET user_avatars NO STORAGE
-- ============================================
-- Execute este arquivo no SQL Editor do Supabase
-- para criar o bucket de avatares de usuários

-- Criar o bucket user_avatars se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user_avatars',
  'user_avatars',
  true, -- Bucket público para permitir acesso às imagens
  5242880, -- Limite de 5MB por arquivo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- NOTA IMPORTANTE SOBRE POLÍTICAS RLS
-- ============================================
-- As políticas RLS precisam ser criadas via Dashboard do Supabase
-- ou por um usuário com permissões de superuser.
-- 
-- Se você receber erro "must be owner of table objects",
-- use o Dashboard: Storage → Policies → user_avatars → New Policy
-- 
-- Veja o arquivo INSTRUCOES_CRIAR_POLITICAS_AVATAR.md para instruções detalhadas.
-- ============================================

-- Tentar criar políticas (pode falhar se não tiver permissões)
DO $$
BEGIN
  -- Remover políticas antigas se existirem
  DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

  -- Criar políticas
  CREATE POLICY "Users can upload their own avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user_avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

  CREATE POLICY "Users can update their own avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user_avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user_avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

  CREATE POLICY "Users can delete their own avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user_avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

  CREATE POLICY "Anyone can view avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'user_avatars');

  RAISE NOTICE 'Políticas criadas com sucesso!';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE '⚠️ Permissões insuficientes. Use o Dashboard do Supabase (Storage → Policies) para criar as políticas manualmente.';
    RAISE NOTICE 'Veja INSTRUCOES_CRIAR_POLITICAS_AVATAR.md para instruções detalhadas.';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Erro ao criar políticas: %', SQLERRM;
    RAISE NOTICE 'Use o Dashboard do Supabase (Storage → Policies) para criar as políticas manualmente.';
END $$;

-- Verificar se o bucket foi criado
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id = 'user_avatars';

