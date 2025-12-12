-- ============================================
-- MIGRATION: Função para criar lembretes retroativos
-- Data: 2025-01-15
-- Descrição: Cria lembretes para agendamentos confirmados que já existem
-- ============================================

-- Função para criar lembretes retroativos para agendamentos confirmados existentes
CREATE OR REPLACE FUNCTION create_retroactive_reminders(p_business_id UUID DEFAULT NULL)
RETURNS TABLE (
  appointment_id UUID,
  reminders_created INTEGER,
  status TEXT
) AS $$
DECLARE
  appointment_record RECORD;
  v_client_id UUID;
  reminders_count INTEGER;
  total_created INTEGER := 0;
BEGIN
  -- Buscar todos os agendamentos confirmados que ainda não passaram
  FOR appointment_record IN
    SELECT 
      a.id,
      a.business_id,
      a.client_name,
      a.client_email,
      a.client_whatsapp,
      a.start_time,
      a.status
    FROM appointments a
    WHERE a.status = 'confirmed'
      AND a.start_time > NOW() -- Apenas agendamentos futuros
      AND (p_business_id IS NULL OR a.business_id = p_business_id)
      AND NOT EXISTS (
        -- Verificar se já existem lembretes para este agendamento
        SELECT 1 FROM reminders r
        WHERE r.appointment_id = a.id
          AND r.reminder_type = 'appointment_auto'
      )
  LOOP
    -- Buscar client_id do cliente
    SELECT id INTO v_client_id
    FROM clients
    WHERE business_id = appointment_record.business_id
      AND (
        (appointment_record.client_email IS NOT NULL AND email = appointment_record.client_email) OR
        (appointment_record.client_whatsapp IS NOT NULL AND whatsapp = appointment_record.client_whatsapp) OR
        (appointment_record.client_name IS NOT NULL AND name = appointment_record.client_name)
      )
    LIMIT 1;
    
    -- Se encontrou cliente, criar lembretes
    IF v_client_id IS NOT NULL THEN
      SELECT create_appointment_reminders(
        appointment_record.id,
        appointment_record.business_id,
        v_client_id,
        appointment_record.start_time
      ) INTO reminders_count;
      
      total_created := total_created + reminders_count;
      
      RETURN QUERY SELECT 
        appointment_record.id,
        reminders_count,
        'success'::TEXT;
    ELSE
      -- Cliente não encontrado
      RETURN QUERY SELECT 
        appointment_record.id,
        0,
        'client_not_found'::TEXT;
    END IF;
  END LOOP;
  
  -- Se não encontrou nenhum agendamento
  IF total_created = 0 THEN
    RETURN QUERY SELECT 
      NULL::UUID,
      0,
      'no_appointments'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_retroactive_reminders IS 'Cria lembretes retroativos para agendamentos confirmados que ainda não passaram e não têm lembretes';


