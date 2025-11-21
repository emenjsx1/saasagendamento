-- ============================================
-- ADICIONAR CAMPO avatar_url NA TABELA profiles
-- ============================================
-- Execute este arquivo no SQL Editor do Supabase
-- para adicionar suporte a foto de perfil

-- Adicionar coluna avatar_url se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN avatar_url TEXT;
    
    RAISE NOTICE 'Coluna avatar_url adicionada com sucesso!';
  ELSE
    RAISE NOTICE 'Coluna avatar_url já existe.';
  END IF;
END $$;

-- ============================================
-- CRIAR BUCKET user_avatars NO STORAGE
-- ============================================
-- IMPORTANTE: Você precisa criar o bucket manualmente no Supabase Dashboard:
-- 1. Vá em Storage no menu lateral
-- 2. Clique em "New bucket"
-- 3. Nome: user_avatars
-- 4. Marque como "Public bucket" (para permitir acesso público às imagens)
-- 5. Clique em "Create bucket"
--
-- Ou execute via SQL (requer permissões de admin):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('user_avatars', 'user_avatars', true)
-- ON CONFLICT (id) DO NOTHING;

