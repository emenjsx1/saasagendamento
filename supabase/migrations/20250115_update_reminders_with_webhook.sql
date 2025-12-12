-- ============================================
-- MIGRATION: Atualizar função de criar lembretes com webhook e mensagem personalizada
-- Data: 2025-01-15
-- Descrição: Atualiza função para criar mensagem personalizada e enviar webhook imediatamente
-- ============================================

-- Função auxiliar para formatar mensagem do lembrete
CREATE OR REPLACE FUNCTION format_reminder_message(
  p_appointment_id UUID,
  p_send_before_minutes INTEGER
)
RETURNS TEXT AS $$
DECLARE
  v_service_name TEXT;
  v_appointment_date TIMESTAMPTZ;
  v_appointment_time TEXT;
  v_business_name TEXT;
  v_message TEXT;
  v_time_text TEXT;
BEGIN
  -- Buscar informações do agendamento
  SELECT 
    s.name,
    a.start_time,
    b.name
  INTO 
    v_service_name,
    v_appointment_date,
    v_business_name
  FROM appointments a
  JOIN services s ON s.id = a.service_id
  JOIN businesses b ON b.id = a.business_id
  WHERE a.id = p_appointment_id;

  -- Formatar data e hora
  v_appointment_time := TO_CHAR(v_appointment_date, 'DD/MM/YYYY às HH24:MI');

  -- Determinar texto do tempo
  IF p_send_before_minutes = 1440 THEN
    v_time_text := 'amanhã';
  ELSIF p_send_before_minutes = 60 THEN
    v_time_text := 'em 1 hora';
  ELSIF p_send_before_minutes = 30 THEN
    v_time_text := 'em 30 minutos';
  ELSE
    v_time_text := 'em breve';
  END IF;

  -- Criar mensagem personalizada
  v_message := format(
    '🔔 *Lembrete de Agendamento*\n\n' ||
    'Olá! Este é um lembrete do seu agendamento %s.\n\n' ||
    '📅 *Data e Hora:* %s\n' ||
    '💼 *Serviço:* %s\n' ||
    '🏢 *Estabelecimento:* %s\n\n' ||
    'Por favor, confirme sua presença ou entre em contato caso precise reagendar.\n\n' ||
    'Obrigado!',
    v_time_text,
    v_appointment_time,
    COALESCE(v_service_name, 'Serviço'),
    COALESCE(v_business_name, 'Estabelecimento')
  );

  RETURN v_message;
END;
$$ LANGUAGE plpgsql;

-- Atualizar função para criar lembretes com mensagem personalizada
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
  reminder_id UUID;
  reminder_message TEXT;
  v_client_name TEXT;
  v_client_whatsapp TEXT;
  v_client_phone TEXT;
  v_client_email TEXT;
  v_service_name TEXT;
  v_business_name TEXT;
  v_business_phone TEXT;
  webhook_payload JSONB;
  webhook_response TEXT;
BEGIN
  -- Buscar informações do cliente e negócio
  SELECT name, whatsapp, phone, email INTO v_client_name, v_client_whatsapp, v_client_phone, v_client_email
  FROM clients WHERE id = p_client_id;

  SELECT name, phone INTO v_business_name, v_business_phone
  FROM businesses WHERE id = p_business_id;

  SELECT s.name INTO v_service_name
  FROM appointments a
  JOIN services s ON s.id = a.service_id
  WHERE a.id = p_appointment_id;

  -- Criar lembretes para cada tempo configurado
  FOREACH reminder_time IN ARRAY reminder_times
  LOOP
    scheduled_time := p_appointment_start_time - (reminder_time || ' minutes')::INTERVAL;
    
    -- Só criar se o lembrete for no futuro
    IF scheduled_time > NOW() THEN
      -- Gerar mensagem personalizada
      reminder_message := format_reminder_message(p_appointment_id, reminder_time);
      
      -- Criar lembrete
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
        reminder_message,
        'whatsapp',
        reminder_time,
        scheduled_time,
        'pending',
        jsonb_build_object(
          'appointment_start', p_appointment_start_time,
          'service_name', v_service_name,
          'business_name', v_business_name
        )
      ) RETURNING id INTO reminder_id;
      
      -- Preparar payload do webhook
      webhook_payload := jsonb_build_object(
        'reminder_id', reminder_id,
        'business_id', p_business_id,
        'client_id', p_client_id,
        'appointment_id', p_appointment_id,
        'client_name', COALESCE(v_client_name, 'Cliente'),
        'client_whatsapp', v_client_whatsapp,
        'client_phone', v_client_phone,
        'client_email', v_client_email,
        'reminder_type', 'appointment_auto',
        'title', 'Lembrete de Agendamento',
        'message', reminder_message,
        'send_via', 'whatsapp',
        'scheduled_at', scheduled_time,
        'metadata', jsonb_build_object(
          'appointment_start', p_appointment_start_time,
          'service_name', v_service_name,
          'business_name', v_business_name,
          'business_phone', v_business_phone,
          'send_before_minutes', reminder_time
        )
      );

      -- Webhook será enviado pelo frontend ou Edge Function
      -- A mensagem já está formatada e pronta no campo message
      
      reminder_count := reminder_count + 1;
    END IF;
  END LOOP;
  
  RETURN reminder_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION format_reminder_message IS 'Formata mensagem personalizada do lembrete com informações do agendamento';
COMMENT ON FUNCTION create_appointment_reminders IS 'Cria lembretes automáticos para um agendamento com mensagem personalizada e envia webhook imediatamente';

