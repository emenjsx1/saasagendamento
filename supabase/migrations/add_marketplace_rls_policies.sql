-- ============================================
-- POLÍTICAS RLS PARA MARKETPLACE
-- ============================================

-- Habilitar RLS na tabela business_ratings
ALTER TABLE business_ratings ENABLE ROW LEVEL SECURITY;

-- Políticas para business_ratings
-- Qualquer pessoa pode ler avaliações (público)
CREATE POLICY "business_ratings_select_public"
ON business_ratings
FOR SELECT
USING (true);

-- Apenas usuários autenticados podem criar avaliações
CREATE POLICY "business_ratings_insert_authenticated"
ON business_ratings
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Usuários só podem atualizar suas próprias avaliações
CREATE POLICY "business_ratings_update_own"
ON business_ratings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Usuários só podem deletar suas próprias avaliações
CREATE POLICY "business_ratings_delete_own"
ON business_ratings
FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para businesses (se ainda não existirem)
-- Permitir leitura pública de negócios públicos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'businesses' 
    AND policyname = 'businesses_select_public'
  ) THEN
    CREATE POLICY "businesses_select_public"
    ON businesses
    FOR SELECT
    USING (is_public = true OR owner_id = auth.uid());
  END IF;
END $$;

-- Permitir que donos vejam seus próprios negócios mesmo se não forem públicos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'businesses' 
    AND policyname = 'businesses_select_owner'
  ) THEN
    CREATE POLICY "businesses_select_owner"
    ON businesses
    FOR SELECT
    USING (owner_id = auth.uid());
  END IF;
END $$;

