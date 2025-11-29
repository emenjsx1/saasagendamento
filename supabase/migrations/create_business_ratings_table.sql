-- ============================================
-- TABELA DE AVALIAÇÕES DE NEGÓCIOS
-- ============================================

-- Criar tabela de avaliações
CREATE TABLE IF NOT EXISTS business_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Um usuário só pode avaliar um negócio uma vez
  UNIQUE(business_id, user_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_business_ratings_business_id ON business_ratings(business_id);
CREATE INDEX IF NOT EXISTS idx_business_ratings_user_id ON business_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_business_ratings_rating ON business_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_business_ratings_created_at ON business_ratings(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_business_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_business_ratings_updated_at ON business_ratings;
CREATE TRIGGER trg_update_business_ratings_updated_at
  BEFORE UPDATE ON business_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_business_ratings_updated_at();

-- Função para calcular rating médio e contagem de avaliações
CREATE OR REPLACE FUNCTION get_business_rating_stats(p_business_id UUID)
RETURNS TABLE (
  average_rating DECIMAL(3, 2),
  total_ratings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00)::DECIMAL(3, 2) as average_rating,
    COUNT(*)::BIGINT as total_ratings
  FROM business_ratings
  WHERE business_id = p_business_id;
END;
$$ LANGUAGE plpgsql;

-- View para facilitar consultas de ratings agregados
CREATE OR REPLACE VIEW business_ratings_summary AS
SELECT 
  business_id,
  COUNT(*) as total_ratings,
  ROUND(AVG(rating)::numeric, 2) as average_rating,
  COUNT(*) FILTER (WHERE rating = 5) as five_star_count,
  COUNT(*) FILTER (WHERE rating = 4) as four_star_count,
  COUNT(*) FILTER (WHERE rating = 3) as three_star_count,
  COUNT(*) FILTER (WHERE rating = 2) as two_star_count,
  COUNT(*) FILTER (WHERE rating = 1) as one_star_count
FROM business_ratings
GROUP BY business_id;

-- Comentários para documentação
COMMENT ON TABLE business_ratings IS 'Avaliações e comentários dos clientes sobre os negócios';
COMMENT ON COLUMN business_ratings.rating IS 'Avaliação de 1 a 5 estrelas';
COMMENT ON COLUMN business_ratings.comment IS 'Comentário opcional do cliente';

