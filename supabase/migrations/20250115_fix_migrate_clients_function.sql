-- ============================================
-- CORREÇÃO: Função de migração de clientes
-- Data: 2025-01-15
-- Descrição: Corrige a função migrate_clients_from_appointments para não usar ON CONFLICT
-- ============================================

CREATE OR REPLACE FUNCTION migrate_clients_from_appointments()
RETURNS INTEGER AS $$
DECLARE
  client_count INTEGER := 0;
  client_record RECORD;
BEGIN
  -- Loop através de clientes únicos dos appointments
  FOR client_record IN
    SELECT DISTINCT
      a.business_id,
      a.client_name,
      a.client_email,
      a.client_whatsapp,
      MIN(a.created_at) as created_at
    FROM appointments a
    WHERE a.business_id IS NOT NULL
      AND a.client_name IS NOT NULL
      AND a.client_name != ''
    GROUP BY a.business_id, a.client_name, a.client_email, a.client_whatsapp
  LOOP
    -- Verificar se o cliente já existe
    -- Por email (se não for NULL/vazio)
    IF client_record.client_email IS NOT NULL AND client_record.client_email != '' THEN
      IF NOT EXISTS (
        SELECT 1 FROM clients 
        WHERE business_id = client_record.business_id 
          AND email = client_record.client_email
      ) THEN
        INSERT INTO clients (business_id, name, email, whatsapp, created_at)
        VALUES (
          client_record.business_id,
          client_record.client_name,
          client_record.client_email,
          client_record.client_whatsapp,
          client_record.created_at
        );
        client_count := client_count + 1;
      END IF;
    -- Por nome e whatsapp (se email não existir)
    ELSIF client_record.client_whatsapp IS NOT NULL AND client_record.client_whatsapp != '' THEN
      IF NOT EXISTS (
        SELECT 1 FROM clients 
        WHERE business_id = client_record.business_id 
          AND name = client_record.client_name
          AND whatsapp = client_record.client_whatsapp
          AND (email IS NULL OR email = '')
      ) THEN
        INSERT INTO clients (business_id, name, email, whatsapp, created_at)
        VALUES (
          client_record.business_id,
          client_record.client_name,
          NULL,
          client_record.client_whatsapp,
          client_record.created_at
        );
        client_count := client_count + 1;
      END IF;
    -- Apenas por nome (se não tiver email nem whatsapp)
    ELSE
      IF NOT EXISTS (
        SELECT 1 FROM clients 
        WHERE business_id = client_record.business_id 
          AND name = client_record.client_name
          AND (email IS NULL OR email = '')
          AND (whatsapp IS NULL OR whatsapp = '')
      ) THEN
        INSERT INTO clients (business_id, name, email, whatsapp, created_at)
        VALUES (
          client_record.business_id,
          client_record.client_name,
          NULL,
          NULL,
          client_record.created_at
        );
        client_count := client_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN client_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_clients_from_appointments IS 'Migra clientes existentes da tabela appointments para clients, evitando duplicatas';


