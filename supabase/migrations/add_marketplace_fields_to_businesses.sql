-- ============================================
-- ADICIONAR CAMPOS DE MARKETPLACE À TABELA BUSINESSES
-- ============================================

-- Adicionar campos de categoria e localização
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Criar índice para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_province ON businesses(province);
CREATE INDEX IF NOT EXISTS idx_businesses_is_public ON businesses(is_public);
CREATE INDEX IF NOT EXISTS idx_businesses_category_province ON businesses(category, province);

-- Comentários para documentação
COMMENT ON COLUMN businesses.category IS 'Categoria do negócio: salão, clínica, barbearia, estúdio, consultório, veterinário, fisioterapia, psicologia, nutrição';
COMMENT ON COLUMN businesses.province IS 'Província de Moçambique onde o negócio está localizado';
COMMENT ON COLUMN businesses.city IS 'Cidade onde o negócio está localizado';
COMMENT ON COLUMN businesses.latitude IS 'Coordenada de latitude (opcional, para futuras funcionalidades de mapa)';
COMMENT ON COLUMN businesses.longitude IS 'Coordenada de longitude (opcional, para futuras funcionalidades de mapa)';
COMMENT ON COLUMN businesses.is_public IS 'Se o negócio aparece no marketplace público';

