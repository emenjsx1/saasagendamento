-- ============================================
-- TABELAS DE AFILIADOS E CUPONS
-- Cria as tabelas affiliates e coupons com a relação correta
-- ============================================

-- Criar tabela de cupons (se não existir)
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para cupons
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);

-- Criar tabela de afiliados (se não existir)
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  commission_rate DECIMAL(5, 2) DEFAULT 0.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sales_count INTEGER DEFAULT 0 CHECK (sales_count >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, code)
);

-- Criar índices para afiliados
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(code);
CREATE INDEX IF NOT EXISTS idx_affiliates_coupon_id ON affiliates(coupon_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_is_active ON affiliates(is_active);

-- Habilitar RLS (Row Level Security)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cupons (ajuste conforme necessário)
CREATE POLICY "Cupons são públicos para leitura"
  ON coupons FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem criar/atualizar cupons"
  ON coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Políticas RLS para afiliados
CREATE POLICY "Usuários podem ver seus próprios afiliados"
  ON affiliates FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem criar seus próprios afiliados"
  ON affiliates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios afiliados"
  ON affiliates FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  ));

CREATE POLICY "Apenas admins podem deletar afiliados"
  ON affiliates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON affiliates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

