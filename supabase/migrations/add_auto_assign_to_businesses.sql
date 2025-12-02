-- ============================================
-- ADICIONAR CONFIGURAÇÃO DE DISTRIBUIÇÃO AUTOMÁTICA
-- Permite que negócios configurem se querem distribuição automática de agendamentos
-- ============================================

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS auto_assign_employees BOOLEAN DEFAULT false;

-- Comentário para documentação
COMMENT ON COLUMN businesses.auto_assign_employees IS 'Se true, distribui agendamentos automaticamente entre funcionários disponíveis usando round-robin. Se false, cliente escolhe o funcionário';

