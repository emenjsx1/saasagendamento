-- ============================================
-- EXECUTAR TODAS AS MIGRATIONS DE FUNCIONÁRIOS
-- Execute este arquivo completo no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CRIAR TABELA DE FUNCIONÁRIOS
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
DROP TRIGGER IF EXISTS trigger_update_employees_updated_at ON employees;
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

-- ============================================
-- 2. ADICIONAR FUNCIONÁRIO AOS AGENDAMENTOS
-- ============================================

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Índice para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_appointments_employee_id ON appointments(employee_id);

-- Comentário para documentação
COMMENT ON COLUMN appointments.employee_id IS 'ID do funcionário atribuído a este agendamento (pode ser NULL se não atribuído ou se distribuição automática)';

-- ============================================
-- 3. ADICIONAR CONFIGURAÇÃO DE DISTRIBUIÇÃO AUTOMÁTICA
-- ============================================

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS auto_assign_employees BOOLEAN DEFAULT false;

-- Comentário para documentação
COMMENT ON COLUMN businesses.auto_assign_employees IS 'Se true, distribui agendamentos automaticamente entre funcionários disponíveis usando round-robin. Se false, cliente escolhe o funcionário';

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Verificar se tudo foi criado corretamente
DO $$
BEGIN
  RAISE NOTICE '✅ Migration executada com sucesso!';
  RAISE NOTICE 'Tabela employees: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'employees');
  RAISE NOTICE 'Coluna employee_id em appointments: %', (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'employee_id');
  RAISE NOTICE 'Coluna auto_assign_employees em businesses: %', (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'auto_assign_employees');
END $$;

