-- ============================================
-- ADICIONAR FUNCIONÁRIO AOS AGENDAMENTOS
-- Vincula agendamentos a funcionários específicos
-- ============================================

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Índice para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_appointments_employee_id ON appointments(employee_id);

-- Comentário para documentação
COMMENT ON COLUMN appointments.employee_id IS 'ID do funcionário atribuído a este agendamento (pode ser NULL se não atribuído ou se distribuição automática)';

