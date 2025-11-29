-- ============================================
-- ADICIONAR CAMPOS DE CLIENTE À TABELA APPOINTMENTS
-- ============================================

-- Adicionar campos para vincular agendamentos a usuários
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_rated BOOLEAN DEFAULT false;

-- Criar índices para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_email ON appointments(client_email);
CREATE INDEX IF NOT EXISTS idx_appointments_is_rated ON appointments(is_rated);
CREATE INDEX IF NOT EXISTS idx_appointments_user_status ON appointments(user_id, status);

-- Comentários para documentação
COMMENT ON COLUMN appointments.user_id IS 'ID do usuário que fez o agendamento (se tiver conta)';
COMMENT ON COLUMN appointments.is_rated IS 'Indica se o cliente já avaliou este agendamento';

-- ============================================
-- FUNÇÕES PARA VINCULAR AGENDAMENTOS
-- ============================================

-- Função para vincular agendamentos existentes por email quando cliente cria conta
CREATE OR REPLACE FUNCTION link_appointments_to_user(p_user_id UUID, p_email TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_linked_count INTEGER;
BEGIN
  -- Vincular agendamentos que têm o mesmo email e ainda não estão vinculados
  UPDATE appointments
  SET user_id = p_user_id
  WHERE client_email = p_email
    AND user_id IS NULL
    AND client_email IS NOT NULL
    AND client_email != '';
  
  GET DIAGNOSTICS v_linked_count = ROW_COUNT;
  
  RETURN v_linked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para vincular agendamentos existentes em lote (para uso administrativo)
CREATE OR REPLACE FUNCTION link_all_appointments_by_email()
RETURNS INTEGER AS $$
DECLARE
  v_linked_count INTEGER;
BEGIN
  -- Vincular agendamentos que têm email correspondente em profiles
  UPDATE appointments a
  SET user_id = p.id
  FROM profiles p
  WHERE a.client_email = p.email
    AND a.user_id IS NULL
    AND a.client_email IS NOT NULL
    AND a.client_email != ''
    AND p.email IS NOT NULL
    AND p.email != '';
  
  GET DIAGNOSTICS v_linked_count = ROW_COUNT;
  
  RETURN v_linked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON FUNCTION link_appointments_to_user IS 'Vincula agendamentos de um email específico a um usuário';
COMMENT ON FUNCTION link_all_appointments_by_email IS 'Vincula todos os agendamentos que têm email correspondente em profiles';

