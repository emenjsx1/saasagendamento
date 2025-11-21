-- ============================================
-- 🔧 CORRIGIR RLS - EXECUTE ESTE SCRIPT AGORA
-- ============================================
-- 
-- Este script desabilita RLS na tabela user_consolidated
-- para permitir acesso da área administrativa
--
-- Execute no SQL Editor do Supabase
-- ============================================

-- Desabilitar RLS completamente (RECOMENDADO para área admin)
ALTER TABLE user_consolidated DISABLE ROW LEVEL SECURITY;

-- Verificar se funcionou
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'user_consolidated';

-- Se retornar "false" na coluna rls_enabled, está correto! ✅


