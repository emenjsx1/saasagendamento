-- ============================================
-- 🔧 CORRIGIR RLS DA TABELA PROFILES
-- ============================================
-- 
-- O problema: RLS na tabela profiles está bloqueando
-- o acesso da área admin, mostrando apenas 1 usuário
-- 
-- Execute no SQL Editor do Supabase
-- ============================================

-- Verificar status atual do RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- Ver políticas existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- ============================================
-- OPÇÃO 1: DESABILITAR RLS (RECOMENDADO para área admin)
-- ============================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- OPÇÃO 2: CRIAR POLÍTICA PARA ADMINS (se preferir manter RLS)
-- ============================================
-- Descomente as linhas abaixo e comente a linha "DISABLE ROW LEVEL SECURITY" acima

/*
-- Política: Administradores podem ver todos os perfis
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Política: Usuários podem ver seus próprios perfis
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);
*/

-- Verificar se funcionou
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- Se rls_enabled for false, está correto! ✅


