-- ============================================
-- TABELA DE FUNCIONÁRIOS/ATENDENTES
-- Permite que negócios registrem seus funcionários
-- ============================================

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_employees_business_id ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(business_id, is_active);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_employees_updated_at();

-- Comentários para documentação
COMMENT ON TABLE employees IS 'Funcionários/atendentes de cada negócio';
COMMENT ON COLUMN employees.business_id IS 'ID do negócio ao qual o funcionário pertence';
COMMENT ON COLUMN employees.name IS 'Nome do funcionário';
COMMENT ON COLUMN employees.phone IS 'Telefone do funcionário (opcional)';
COMMENT ON COLUMN employees.email IS 'Email do funcionário (opcional)';
COMMENT ON COLUMN employees.is_active IS 'Se true, funcionário está ativo e pode receber agendamentos';

