-- ============================================
-- ADICIONAR CAMPO DE PAGAMENTO DURANTE AGENDAMENTO
-- Data: 2025-01-15
-- Descrição: Adiciona campo para ativar pagamento durante o agendamento
-- ============================================

-- Adicionar campo require_payment_on_booking
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS require_payment_on_booking BOOLEAN DEFAULT false;

-- Comentário para documentação
COMMENT ON COLUMN businesses.require_payment_on_booking IS 'Se true, o cliente deve pagar durante o agendamento. Se pagar, o agendamento é confirmado automaticamente.';

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_businesses_require_payment_on_booking ON businesses(require_payment_on_booking);


