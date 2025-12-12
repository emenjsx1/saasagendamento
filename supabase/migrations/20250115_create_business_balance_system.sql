-- ============================================
-- SISTEMA DE SALDO E SAQUES PARA NEGÓCIOS
-- Data: 2025-01-15
-- Descrição: Cria sistema de saldo e saques para pagamentos de agendamentos
-- ============================================

-- ============================================
-- TABELA: business_balance
-- Armazena o saldo disponível de cada negócio
-- ============================================
CREATE TABLE IF NOT EXISTS business_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  available_balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  pending_balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL, -- Saldo pendente (aguardando confirmação)
  total_earned DECIMAL(10, 2) DEFAULT 0.00 NOT NULL, -- Total ganho (antes das taxas de saque)
  total_withdrawn DECIMAL(10, 2) DEFAULT 0.00 NOT NULL, -- Total sacado
  currency TEXT DEFAULT 'MZN' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_business_balance_business_id ON business_balance(business_id);
CREATE INDEX IF NOT EXISTS idx_business_balance_updated_at ON business_balance(updated_at DESC);

-- Comentários
COMMENT ON TABLE business_balance IS 'Saldo disponível de cada negócio para saque';
COMMENT ON COLUMN business_balance.available_balance IS 'Saldo disponível para saque (após taxas de transação)';
COMMENT ON COLUMN business_balance.pending_balance IS 'Saldo pendente (aguardando confirmação de pagamento)';
COMMENT ON COLUMN business_balance.total_earned IS 'Total ganho pelo negócio (antes das taxas de saque)';
COMMENT ON COLUMN business_balance.total_withdrawn IS 'Total já sacado pelo negócio';

-- ============================================
-- TABELA: business_withdrawal_info
-- Armazena informações para saque do negócio
-- ============================================
CREATE TABLE IF NOT EXISTS business_withdrawal_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  withdrawal_method TEXT NOT NULL CHECK (withdrawal_method IN ('mpesa', 'emola', 'bank_transfer', 'email')),
  phone_number TEXT, -- Para M-Pesa/e-Mola
  email TEXT, -- Para transferência bancária ou email
  bank_name TEXT, -- Nome do banco
  account_number TEXT, -- Número da conta
  account_holder_name TEXT, -- Nome do titular
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_business_withdrawal_info_business_id ON business_withdrawal_info(business_id);
CREATE INDEX IF NOT EXISTS idx_business_withdrawal_info_active ON business_withdrawal_info(business_id, is_active) WHERE is_active = true;

-- Índice único parcial: apenas uma informação ativa por método por negócio
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_withdrawal_info_unique_active 
  ON business_withdrawal_info(business_id, withdrawal_method) 
  WHERE is_active = true;

-- Comentários
COMMENT ON TABLE business_withdrawal_info IS 'Informações de saque configuradas pelo negócio';
COMMENT ON COLUMN business_withdrawal_info.withdrawal_method IS 'Método de saque: mpesa, emola, bank_transfer, email';

-- ============================================
-- TABELA: withdrawals
-- Registra todos os saques realizados
-- ============================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL, -- Valor solicitado
  withdrawal_fee DECIMAL(10, 2) NOT NULL, -- Taxa de 2%
  net_amount DECIMAL(10, 2) NOT NULL, -- Valor líquido após taxa (amount - withdrawal_fee)
  withdrawal_method TEXT NOT NULL CHECK (withdrawal_method IN ('mpesa', 'emola', 'bank_transfer', 'email')),
  destination TEXT NOT NULL, -- Telefone, email ou conta bancária
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed', 'cancelled')),
  currency TEXT DEFAULT 'MZN' NOT NULL,
  notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_withdrawals_business_id ON withdrawals(business_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);

-- Comentários
COMMENT ON TABLE withdrawals IS 'Registro de todos os saques realizados pelos negócios';
COMMENT ON COLUMN withdrawals.withdrawal_fee IS 'Taxa de 2% cobrada pela plataforma em cada saque';
COMMENT ON COLUMN withdrawals.net_amount IS 'Valor líquido que será transferido (amount - withdrawal_fee)';

-- ============================================
-- FUNÇÃO: Adicionar saldo ao negócio
-- Calcula automaticamente a taxa de 8% e adiciona o valor líquido
-- ============================================
CREATE OR REPLACE FUNCTION add_to_business_balance(
  p_business_id UUID,
  p_amount DECIMAL(10, 2),
  p_currency TEXT DEFAULT 'MZN'
)
RETURNS VOID AS $$
DECLARE
  v_transaction_fee DECIMAL(10, 2);
  v_net_amount DECIMAL(10, 2);
BEGIN
  -- Calcular taxa de 8% da transação
  v_transaction_fee := p_amount * 0.08;
  v_net_amount := p_amount - v_transaction_fee;
  
  -- Inserir ou atualizar saldo
  INSERT INTO business_balance (
    business_id,
    available_balance,
    total_earned,
    currency,
    updated_at
  )
  VALUES (
    p_business_id,
    v_net_amount,
    v_net_amount,
    p_currency,
    NOW()
  )
  ON CONFLICT (business_id) DO UPDATE
  SET
    available_balance = business_balance.available_balance + v_net_amount,
    total_earned = business_balance.total_earned + v_net_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO: Processar saque
-- Deduz o valor do saldo e cria registro de saque
-- ============================================
CREATE OR REPLACE FUNCTION process_withdrawal(
  p_business_id UUID,
  p_amount DECIMAL(10, 2),
  p_withdrawal_method TEXT,
  p_destination TEXT,
  p_currency TEXT DEFAULT 'MZN',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_withdrawal_fee DECIMAL(10, 2);
  v_net_amount DECIMAL(10, 2);
  v_available_balance DECIMAL(10, 2);
  v_withdrawal_id UUID;
BEGIN
  -- Verificar saldo disponível
  SELECT available_balance INTO v_available_balance
  FROM business_balance
  WHERE business_id = p_business_id;
  
  IF v_available_balance IS NULL OR v_available_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Saldo disponível: %', COALESCE(v_available_balance, 0);
  END IF;
  
  -- Calcular taxa de 2% do saque
  v_withdrawal_fee := p_amount * 0.02;
  v_net_amount := p_amount - v_withdrawal_fee;
  
  -- Criar registro de saque
  INSERT INTO withdrawals (
    business_id,
    amount,
    withdrawal_fee,
    net_amount,
    withdrawal_method,
    destination,
    status,
    currency,
    notes
  )
  VALUES (
    p_business_id,
    p_amount,
    v_withdrawal_fee,
    v_net_amount,
    p_withdrawal_method,
    p_destination,
    'pending',
    p_currency,
    p_notes
  )
  RETURNING id INTO v_withdrawal_id;
  
  -- Deduzir do saldo disponível
  UPDATE business_balance
  SET
    available_balance = available_balance - p_amount,
    total_withdrawn = total_withdrawn + p_amount,
    updated_at = NOW()
  WHERE business_id = p_business_id;
  
  RETURN v_withdrawal_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_business_balance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_balance_updated_at
  BEFORE UPDATE ON business_balance
  FOR EACH ROW
  EXECUTE FUNCTION update_business_balance_updated_at();

CREATE OR REPLACE FUNCTION update_withdrawals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_withdrawals_updated_at
  BEFORE UPDATE ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_withdrawals_updated_at();

CREATE OR REPLACE FUNCTION update_business_withdrawal_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_withdrawal_info_updated_at
  BEFORE UPDATE ON business_withdrawal_info
  FOR EACH ROW
  EXECUTE FUNCTION update_business_withdrawal_info_updated_at();

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE business_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_withdrawal_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Políticas para business_balance
CREATE POLICY "Business owners can view their own balance"
  ON business_balance FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Políticas para business_withdrawal_info
CREATE POLICY "Business owners can manage their withdrawal info"
  ON business_withdrawal_info FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Políticas para withdrawals
CREATE POLICY "Business owners can view their withdrawals"
  ON withdrawals FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can create withdrawals"
  ON withdrawals FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

