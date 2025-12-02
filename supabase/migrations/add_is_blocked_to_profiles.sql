-- ============================================
-- ADICIONAR CAMPO is_blocked NA TABELA profiles
-- Permite que admins bloqueiem/desbloqueiem usuários
-- ============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles(is_blocked);

-- Comentário para documentação
COMMENT ON COLUMN profiles.is_blocked IS 'Se true, o usuário está bloqueado e não pode fazer login ou usar a plataforma';

