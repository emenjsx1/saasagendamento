-- ============================================
-- CORRIGIR POLÍTICAS RLS DO BUCKET user_avatars
-- ============================================
-- Execute este arquivo se o bucket existe mas o upload está falhando
-- Isso garante que as políticas RLS estão configuradas corretamente

-- 1. Verificar se o bucket existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'user_avatars') THEN
    RAISE EXCEPTION 'Bucket user_avatars não existe. Execute primeiro: create_user_avatars_bucket.sql';
  END IF;
  RAISE NOTICE 'Bucket user_avatars encontrado!';
END $$;

-- 2. Criar função com SECURITY DEFINER para criar políticas (requer permissões de superuser)
-- NOTA: Se você não tem permissões de superuser, use o Dashboard do Supabase para criar as políticas manualmente

-- Função auxiliar para criar políticas (se tiver permissões)
CREATE OR REPLACE FUNCTION create_avatar_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remover políticas antigas se existirem
  DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;

  -- Criar políticas novas
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
END;
$$;

-- Tentar executar a função (pode falhar se não tiver permissões)
DO $$
BEGIN
  PERFORM create_avatar_policies();
  RAISE NOTICE 'Políticas criadas com sucesso!';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Permissões insuficientes. Use o Dashboard do Supabase para criar as políticas manualmente.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao criar políticas: %. Use o Dashboard do Supabase para criar as políticas manualmente.', SQLERRM;
END $$;

-- 5. Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- 6. Testar se o bucket está acessível
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types,
  created_at 
FROM storage.buckets 
WHERE id = 'user_avatars';

