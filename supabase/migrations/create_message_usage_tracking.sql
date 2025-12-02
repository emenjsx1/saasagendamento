-- ============================================
-- TABELA DE RASTREAMENTO DE USO DE MENSAGENS
-- Rastreia WhatsApp e Email enviados por usuário por mês
-- ============================================

CREATE TABLE IF NOT EXISTS message_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('whatsapp', 'email')),
  usage_month DATE NOT NULL, -- Primeiro dia do mês (ex: 2024-01-01)
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, message_type, usage_month)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_message_usage_user_id ON message_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_message_usage_month ON message_usage(usage_month);
CREATE INDEX IF NOT EXISTS idx_message_usage_type_month ON message_usage(user_id, message_type, usage_month);

-- Função para incrementar contador de mensagens
CREATE OR REPLACE FUNCTION increment_message_usage(
  p_user_id UUID,
  p_message_type TEXT
)
RETURNS VOID AS $$
DECLARE
  v_month_start DATE;
BEGIN
  -- Calcular primeiro dia do mês atual
  v_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Inserir ou atualizar contador
  INSERT INTO message_usage (user_id, message_type, usage_month, count)
  VALUES (p_user_id, p_message_type, v_month_start, 1)
  ON CONFLICT (user_id, message_type, usage_month)
  DO UPDATE SET 
    count = message_usage.count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Função para buscar uso do mês atual
CREATE OR REPLACE FUNCTION get_message_usage(
  p_user_id UUID,
  p_message_type TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_month_start DATE;
  v_count INTEGER;
BEGIN
  v_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  SELECT COALESCE(count, 0) INTO v_count
  FROM message_usage
  WHERE user_id = p_user_id
    AND message_type = p_message_type
    AND usage_month = v_month_start;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;








