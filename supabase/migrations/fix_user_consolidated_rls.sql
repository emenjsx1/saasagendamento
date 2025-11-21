-- ============================================
-- CORRIGIR RLS DA TABELA user_consolidated
-- Execute este arquivo se a tabela já existe mas não tem políticas RLS
-- ============================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view their own consolidated data" ON user_consolidated;
DROP POLICY IF EXISTS "Admins can view all consolidated data" ON user_consolidated;
DROP POLICY IF EXISTS "System can insert and update consolidated data" ON user_consolidated;
DROP POLICY IF EXISTS "Service role can manage all data" ON user_consolidated;

-- DESABILITAR RLS COMPLETAMENTE (RECOMENDADO para área admin)
-- Esta é a solução mais simples e permite acesso total da área administrativa
ALTER TABLE user_consolidated DISABLE ROW LEVEL SECURITY;

-- Opção 2: Criar políticas RLS (se preferir manter RLS habilitado)
-- Descomente as políticas abaixo e comente a linha "DISABLE ROW LEVEL SECURITY" acima

/*
-- Política: Usuários podem ver seus próprios dados
CREATE POLICY "Users can view their own consolidated data"
  ON user_consolidated
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Administradores podem ver todos os dados
CREATE POLICY "Admins can view all consolidated data"
  ON user_consolidated
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Política: Permitir todas as operações para service role (funções do banco)
CREATE POLICY "Service role can manage all data"
  ON user_consolidated
  FOR ALL
  USING (true)
  WITH CHECK (true);
*/

-- Verificar status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'user_consolidated';

