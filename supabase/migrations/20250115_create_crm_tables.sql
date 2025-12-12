-- ============================================
-- MIGRATION: CRM e Funil de Vendas
-- Data: 2025-01-15
-- Descrição: Cria tabelas para CRM básico e pipeline de vendas
-- ============================================

-- ============================================
-- TABELA: clients
-- Armazena informações dos clientes
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  tags TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clients_business_id ON clients(business_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_whatsapp ON clients(whatsapp) WHERE whatsapp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

-- Índices únicos parciais (para garantir unicidade apenas quando o campo não é NULL/vazio)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_unique_email_per_business 
  ON clients(business_id, email) 
  WHERE email IS NOT NULL AND email != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_unique_phone_per_business 
  ON clients(business_id, phone) 
  WHERE phone IS NOT NULL AND phone != '';

-- Comentários
COMMENT ON TABLE clients IS 'Tabela principal de clientes do CRM';
COMMENT ON COLUMN clients.tags IS 'Array de tags para segmentação';
COMMENT ON COLUMN clients.status IS 'Status do cliente: active, inactive, blocked';

-- ============================================
-- TABELA: client_interactions
-- Histórico completo de interações com clientes
-- ============================================
CREATE TABLE IF NOT EXISTS client_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'appointment', 'call', 'email', 'message', 'note', 'payment', 'meeting', 'other'
  )),
  title TEXT,
  description TEXT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_interactions_client_id ON client_interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_interactions_business_id ON client_interactions(business_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON client_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON client_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_appointment_id ON client_interactions(appointment_id) 
  WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_payment_id ON client_interactions(payment_id) 
  WHERE payment_id IS NOT NULL;

-- Comentários
COMMENT ON TABLE client_interactions IS 'Histórico completo de interações com clientes';
COMMENT ON COLUMN client_interactions.interaction_type IS 'Tipo de interação: appointment, call, email, message, note, payment, meeting, other';
COMMENT ON COLUMN client_interactions.metadata IS 'Dados adicionais flexíveis em formato JSON';

-- ============================================
-- TABELA: sales_pipeline
-- Pipeline de vendas (funil)
-- ============================================
CREATE TABLE IF NOT EXISTS sales_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('lead', 'proposal', 'negotiation', 'closed', 'lost')),
  value DECIMAL(10, 2) DEFAULT 0,
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  closed_reason TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pipeline_business_id ON sales_pipeline(business_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON sales_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_client_id ON sales_pipeline(client_id) 
  WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_assigned_to ON sales_pipeline(assigned_to) 
  WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_expected_close_date ON sales_pipeline(expected_close_date) 
  WHERE expected_close_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_tags ON sales_pipeline USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_pipeline_created_at ON sales_pipeline(created_at DESC);

-- Comentários
COMMENT ON TABLE sales_pipeline IS 'Pipeline de vendas (funil) com stages: lead, proposal, negotiation, closed, lost';
COMMENT ON COLUMN sales_pipeline.probability IS 'Probabilidade de fechamento (0-100%)';
COMMENT ON COLUMN sales_pipeline.value IS 'Valor estimado da venda';

-- ============================================
-- TABELA: client_segments
-- Segmentação de clientes
-- ============================================
CREATE TABLE IF NOT EXISTS client_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '{}',
  color TEXT DEFAULT '#2563eb',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint
  CONSTRAINT unique_segment_name_per_business UNIQUE(business_id, name)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_segments_business_id ON client_segments(business_id);
CREATE INDEX IF NOT EXISTS idx_segments_criteria ON client_segments USING GIN(criteria);

-- Comentários
COMMENT ON TABLE client_segments IS 'Segmentos de clientes com critérios personalizados';
COMMENT ON COLUMN client_segments.criteria IS 'Critérios de segmentação em JSON (ex: tags, status, valor total)';

-- ============================================
-- TRIGGERS: updated_at automático
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_interactions_updated_at
  BEFORE UPDATE ON client_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_pipeline_updated_at
  BEFORE UPDATE ON sales_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_segments_updated_at
  BEFORE UPDATE ON client_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Habilitar RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_segments ENABLE ROW LEVEL SECURITY;

-- Policies para clients
CREATE POLICY "Users can view clients from their business"
  ON clients FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clients for their business"
  ON clients FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update clients from their business"
  ON clients FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete clients from their business"
  ON clients FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policies para client_interactions
CREATE POLICY "Users can view interactions from their business"
  ON client_interactions FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert interactions for their business"
  ON client_interactions FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update interactions from their business"
  ON client_interactions FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete interactions from their business"
  ON client_interactions FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policies para sales_pipeline
CREATE POLICY "Users can view pipeline from their business"
  ON sales_pipeline FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pipeline for their business"
  ON sales_pipeline FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pipeline from their business"
  ON sales_pipeline FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete pipeline from their business"
  ON sales_pipeline FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policies para client_segments
CREATE POLICY "Users can view segments from their business"
  ON client_segments FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert segments for their business"
  ON client_segments FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update segments from their business"
  ON client_segments FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete segments from their business"
  ON client_segments FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para calcular valor total do pipeline por stage
CREATE OR REPLACE FUNCTION get_pipeline_value_by_stage(p_business_id UUID)
RETURNS TABLE (
  stage TEXT,
  total_value DECIMAL,
  deal_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.stage,
    COALESCE(SUM(sp.value), 0) as total_value,
    COUNT(*) as deal_count
  FROM sales_pipeline sp
  WHERE sp.business_id = p_business_id
    AND sp.stage != 'lost'
  GROUP BY sp.stage
  ORDER BY 
    CASE sp.stage
      WHEN 'lead' THEN 1
      WHEN 'proposal' THEN 2
      WHEN 'negotiation' THEN 3
      WHEN 'closed' THEN 4
      ELSE 5
    END;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas do cliente
CREATE OR REPLACE FUNCTION get_client_stats(p_client_id UUID)
RETURNS TABLE (
  total_appointments BIGINT,
  total_spent DECIMAL,
  last_interaction_date TIMESTAMPTZ,
  interaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT ci.appointment_id) as total_appointments,
    COALESCE(SUM(p.amount), 0) as total_spent,
    MAX(ci.created_at) as last_interaction_date,
    COUNT(ci.id) as interaction_count
  FROM client_interactions ci
  LEFT JOIN payments p ON p.id = ci.payment_id
  WHERE ci.client_id = p_client_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRAÇÃO: Extrair clientes de appointments
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

-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================
COMMENT ON FUNCTION get_pipeline_value_by_stage IS 'Retorna valor total e contagem de deals por stage';
COMMENT ON FUNCTION get_client_stats IS 'Retorna estatísticas do cliente (agendamentos, gastos, interações)';
COMMENT ON FUNCTION migrate_clients_from_appointments IS 'Migra clientes existentes da tabela appointments para clients';

