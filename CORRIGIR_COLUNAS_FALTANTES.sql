-- ============================================
-- CORRIGIR COLUNAS FALTANTES
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. ADICIONAR COLUNA is_blocked NA TABELA profiles
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles(is_blocked);

-- Comentário para documentação
COMMENT ON COLUMN profiles.is_blocked IS 'Se true, o usuário está bloqueado e não pode fazer login ou usar a plataforma';

-- Atualizar valores existentes para false (caso a coluna já exista com valores NULL)
UPDATE profiles SET is_blocked = false WHERE is_blocked IS NULL;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar se a coluna foi criada
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'is_blocked';

-- Se retornar uma linha, a coluna foi criada com sucesso! ✅

