-- ============================================
-- ADICIONAR POLÍTICAS RLS PARA ADMINS
-- Permitir que administradores vejam e atualizem todos os saques
-- ============================================

-- Política: Admins podem ver todos os saques
CREATE POLICY IF NOT EXISTS "Admins can view all withdrawals"
  ON withdrawals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Política: Admins podem atualizar status dos saques
CREATE POLICY IF NOT EXISTS "Admins can update withdrawal status"
  ON withdrawals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Política: Admins podem ver todos os saldos dos negócios
CREATE POLICY IF NOT EXISTS "Admins can view all business balances"
  ON business_balance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Política: Admins podem ver todas as informações de saque
CREATE POLICY IF NOT EXISTS "Admins can view all withdrawal info"
  ON business_withdrawal_info FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );


