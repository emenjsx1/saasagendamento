-- ============================================
-- MIGRATION: Sistema de Lembretes
-- Data: 2025-01-15
-- Descrição: Cria tabela para gerenciar lembretes automáticos e personalizados
-- ============================================

-- ============================================
-- TABELA: reminders
-- Armazena lembretes automáticos e personalizados
-- ============================================
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('appointment_auto', 'custom')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  send_via TEXT NOT NULL DEFAULT 'whatsapp' CHECK (send_via IN ('whatsapp', 'sms', 'email')),
  send_before_minutes INTEGER, -- Para lembretes automáticos de agendamento (30, 60, 1440)
  scheduled_at TIMESTAMPTZ NOT NULL, -- Quando o lembrete deve ser enviado
  sent_at TIMESTAMPTZ, -- Quando foi enviado
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_appointment_reminder 
    CHECK (
      (reminder_type = 'appointment_auto' AND appointment_id IS NOT NULL) OR
      (reminder_type = 'custom' AND client_id IS NOT NULL)
    )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_reminders_business_id ON reminders(business_id);
CREATE INDEX IF NOT EXISTS idx_reminders_client_id ON reminders(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_appointment_id ON reminders(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_type ON reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminders_created_at ON reminders(created_at DESC);

-- Comentários
COMMENT ON TABLE reminders IS 'Tabela de lembretes automáticos e personalizados para clientes';
COMMENT ON COLUMN reminders.reminder_type IS 'Tipo: appointment_auto (automático de agendamento) ou custom (personalizado)';
COMMENT ON COLUMN reminders.send_before_minutes IS 'Minutos antes do agendamento para enviar (ex: 30, 60, 1440)';
COMMENT ON COLUMN reminders.scheduled_at IS 'Data/hora exata quando o lembrete deve ser enviado';
COMMENT ON COLUMN reminders.status IS 'Status: pending (aguardando), sent (enviado), failed (falhou), cancelled (cancelado)';

-- ============================================
-- TRIGGER: updated_at automático
-- ============================================
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Habilitar RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Policies para reminders
CREATE POLICY "Users can view reminders from their business"
  ON reminders FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reminders for their business"
  ON reminders FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update reminders from their business"
  ON reminders FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete reminders from their business"
  ON reminders FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para criar lembretes automáticos de agendamento
CREATE OR REPLACE FUNCTION create_appointment_reminders(
  p_appointment_id UUID,
  p_business_id UUID,
  p_client_id UUID,
  p_appointment_start_time TIMESTAMPTZ
)
RETURNS INTEGER AS $$
DECLARE
  reminder_count INTEGER := 0;
  reminder_times INTEGER[] := ARRAY[1440, 60, 30]; -- 1 dia, 1 hora, 30 minutos
  reminder_time INTEGER;
  scheduled_time TIMESTAMPTZ;
BEGIN
  -- Criar lembretes para cada tempo configurado
  FOREACH reminder_time IN ARRAY reminder_times
  LOOP
    scheduled_time := p_appointment_start_time - (reminder_time || ' minutes')::INTERVAL;
    
    -- Só criar se o lembrete for no futuro
    IF scheduled_time > NOW() THEN
      INSERT INTO reminders (
        business_id,
        client_id,
        appointment_id,
        reminder_type,
        title,
        message,
        send_via,
        send_before_minutes,
        scheduled_at,
        status,
        metadata
      ) VALUES (
        p_business_id,
        p_client_id,
        p_appointment_id,
        'appointment_auto',
        'Lembrete de Agendamento',
        'Você tem um agendamento em ' || reminder_time || ' minutos.',
        'whatsapp',
        reminder_time,
        scheduled_time,
        'pending',
        jsonb_build_object('appointment_start', p_appointment_start_time)
      );
      
      reminder_count := reminder_count + 1;
    END IF;
  END LOOP;
  
  RETURN reminder_count;
END;
$$ LANGUAGE plpgsql;

-- Função para cancelar lembretes de um agendamento
CREATE OR REPLACE FUNCTION cancel_appointment_reminders(p_appointment_id UUID)
RETURNS INTEGER AS $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  UPDATE reminders
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE appointment_id = p_appointment_id
    AND status = 'pending'
    AND reminder_type = 'appointment_auto';
  
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar lembretes pendentes que devem ser enviados
CREATE OR REPLACE FUNCTION get_pending_reminders_to_send()
RETURNS TABLE (
  id UUID,
  business_id UUID,
  client_id UUID,
  appointment_id UUID,
  reminder_type TEXT,
  title TEXT,
  message TEXT,
  send_via TEXT,
  scheduled_at TIMESTAMPTZ,
  client_whatsapp TEXT,
  client_phone TEXT,
  client_name TEXT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.business_id,
    r.client_id,
    r.appointment_id,
    r.reminder_type,
    r.title,
    r.message,
    r.send_via,
    r.scheduled_at,
    c.whatsapp as client_whatsapp,
    c.phone as client_phone,
    c.name as client_name,
    r.metadata
  FROM reminders r
  LEFT JOIN clients c ON c.id = r.client_id
  WHERE r.status = 'pending'
    AND r.scheduled_at <= NOW()
  ORDER BY r.scheduled_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Comentários das funções
COMMENT ON FUNCTION create_appointment_reminders IS 'Cria lembretes automáticos para um agendamento (1 dia, 1 hora, 30 min antes)';
COMMENT ON FUNCTION cancel_appointment_reminders IS 'Cancela todos os lembretes pendentes de um agendamento';
COMMENT ON FUNCTION get_pending_reminders_to_send IS 'Retorna lembretes pendentes que devem ser enviados agora';

-- ============================================
-- TRIGGERS: Criar lembretes automaticamente
-- ============================================

-- Trigger para criar lembretes quando agendamento é confirmado
CREATE OR REPLACE FUNCTION trigger_create_appointment_reminders()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_business_id UUID;
BEGIN
  -- Só criar lembretes se status mudou para 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Buscar client_id do cliente
    SELECT id INTO v_client_id
    FROM clients
    WHERE business_id = NEW.business_id
      AND (
        (NEW.client_email IS NOT NULL AND email = NEW.client_email) OR
        (NEW.client_whatsapp IS NOT NULL AND whatsapp = NEW.client_whatsapp) OR
        (NEW.client_name IS NOT NULL AND name = NEW.client_name)
      )
    LIMIT 1;
    
    -- Se encontrou cliente, criar lembretes
    IF v_client_id IS NOT NULL THEN
      PERFORM create_appointment_reminders(
        NEW.id,
        NEW.business_id,
        v_client_id,
        NEW.start_time
      );
    END IF;
  END IF;
  
  -- Se agendamento foi cancelado, cancelar lembretes
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    PERFORM cancel_appointment_reminders(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela appointments
CREATE TRIGGER create_reminders_on_appointment_confirmed
  AFTER INSERT OR UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_appointment_reminders();

COMMENT ON FUNCTION trigger_create_appointment_reminders IS 'Trigger que cria lembretes automaticamente quando agendamento é confirmado';

