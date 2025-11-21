-- ============================================
-- TABELA CONSOLIDADA DE USUÁRIOS
-- Contém todas as informações do usuário em um só lugar
-- ============================================

-- Criar tabela consolidada
CREATE TABLE IF NOT EXISTS user_consolidated (
  -- ID do usuário (chave primária, mesma que profiles.id)
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Dados do Profile
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Dados do Negócio (se houver)
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  business_name TEXT,
  business_slug TEXT,
  
  -- Dados da Assinatura
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  plan_name TEXT,
  subscription_status TEXT,
  subscription_created_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  
  -- Dados do Pagamento (mais recente)
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  payment_amount DECIMAL(10, 2),
  payment_status TEXT,
  payment_date TIMESTAMPTZ,
  payment_method TEXT,
  
  -- Role
  is_admin BOOLEAN DEFAULT FALSE,
  is_owner BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'Client', -- 'Admin', 'Owner', 'Client'
  
  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_consolidated_email ON user_consolidated(email);
CREATE INDEX IF NOT EXISTS idx_user_consolidated_business_id ON user_consolidated(business_id);
CREATE INDEX IF NOT EXISTS idx_user_consolidated_subscription_status ON user_consolidated(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_consolidated_role ON user_consolidated(role);

-- ============================================
-- FUNÇÃO PARA ATUALIZAR DADOS CONSOLIDADOS
-- ============================================
CREATE OR REPLACE FUNCTION update_user_consolidated(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_profile RECORD;
  v_business RECORD;
  v_subscription RECORD;
  v_payment RECORD;
  v_is_admin BOOLEAN;
  v_is_owner BOOLEAN;
  v_role TEXT;
BEGIN
  -- 1. Buscar perfil
  SELECT id, email, first_name, last_name, phone, created_at
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    -- Se o perfil não existe, deletar da tabela consolidada
    DELETE FROM user_consolidated WHERE user_id = p_user_id;
    RETURN;
  END IF;

  -- 2. Buscar negócio (se houver)
  SELECT id, name, slug
  INTO v_business
  FROM businesses
  WHERE owner_id = p_user_id
  LIMIT 1;

  -- 3. Buscar assinatura mais recente
  SELECT id, plan_name, status, created_at, trial_ends_at
  INTO v_subscription
  FROM subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- 4. Buscar pagamento mais recente
  SELECT id, amount, status, payment_date, method
  INTO v_payment
  FROM payments
  WHERE user_id = p_user_id
  ORDER BY payment_date DESC
  LIMIT 1;

  -- 5. Verificar se é admin
  SELECT EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_user_id) INTO v_is_admin;

  -- 6. Verificar se é owner
  v_is_owner := (v_business.id IS NOT NULL);

  -- 7. Determinar role
  IF v_is_admin THEN
    v_role := 'Admin';
  ELSIF v_is_owner THEN
    v_role := 'Owner';
  ELSE
    v_role := 'Client';
  END IF;

  -- 8. Inserir ou atualizar na tabela consolidada
  INSERT INTO user_consolidated (
    user_id, email, first_name, last_name, phone, created_at,
    business_id, business_name, business_slug,
    subscription_id, plan_name, subscription_status, subscription_created_at, trial_ends_at,
    payment_id, payment_amount, payment_status, payment_date, payment_method,
    is_admin, is_owner, role, updated_at
  ) VALUES (
    v_profile.id, v_profile.email, v_profile.first_name, v_profile.last_name, v_profile.phone, v_profile.created_at,
    v_business.id, v_business.name, v_business.slug,
    v_subscription.id, v_subscription.plan_name, v_subscription.status, v_subscription.created_at, v_subscription.trial_ends_at,
    v_payment.id, v_payment.amount, v_payment.status, v_payment.payment_date, v_payment.method,
    v_is_admin, v_is_owner, v_role, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    business_id = EXCLUDED.business_id,
    business_name = EXCLUDED.business_name,
    business_slug = EXCLUDED.business_slug,
    subscription_id = EXCLUDED.subscription_id,
    plan_name = EXCLUDED.plan_name,
    subscription_status = EXCLUDED.subscription_status,
    subscription_created_at = EXCLUDED.subscription_created_at,
    trial_ends_at = EXCLUDED.trial_ends_at,
    payment_id = EXCLUDED.payment_id,
    payment_amount = EXCLUDED.payment_amount,
    payment_status = EXCLUDED.payment_status,
    payment_date = EXCLUDED.payment_date,
    payment_method = EXCLUDED.payment_method,
    is_admin = EXCLUDED.is_admin,
    is_owner = EXCLUDED.is_owner,
    role = EXCLUDED.role,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS PARA ATUALIZAR AUTOMATICAMENTE
-- ============================================

-- Trigger quando um perfil é criado ou atualizado
CREATE OR REPLACE FUNCTION trigger_update_user_consolidated_on_profile()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_consolidated(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_user_consolidated_on_profile ON profiles;
CREATE TRIGGER trg_update_user_consolidated_on_profile
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_consolidated_on_profile();

-- Trigger quando um negócio é criado ou atualizado
CREATE OR REPLACE FUNCTION trigger_update_user_consolidated_on_business()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    PERFORM update_user_consolidated(NEW.owner_id);
  END IF;
  IF OLD.owner_id IS NOT NULL AND OLD.owner_id != NEW.owner_id THEN
    PERFORM update_user_consolidated(OLD.owner_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_user_consolidated_on_business ON businesses;
CREATE TRIGGER trg_update_user_consolidated_on_business
  AFTER INSERT OR UPDATE OR DELETE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_consolidated_on_business();

-- Trigger quando uma assinatura é criada ou atualizada
CREATE OR REPLACE FUNCTION trigger_update_user_consolidated_on_subscription()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM update_user_consolidated(NEW.user_id);
  END IF;
  IF OLD.user_id IS NOT NULL AND OLD.user_id != NEW.user_id THEN
    PERFORM update_user_consolidated(OLD.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_user_consolidated_on_subscription ON subscriptions;
CREATE TRIGGER trg_update_user_consolidated_on_subscription
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_consolidated_on_subscription();

-- Trigger quando um pagamento é criado ou atualizado
CREATE OR REPLACE FUNCTION trigger_update_user_consolidated_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM update_user_consolidated(NEW.user_id);
  END IF;
  IF OLD.user_id IS NOT NULL AND OLD.user_id != NEW.user_id THEN
    PERFORM update_user_consolidated(OLD.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_user_consolidated_on_payment ON payments;
CREATE TRIGGER trg_update_user_consolidated_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_consolidated_on_payment();

-- Trigger quando um admin é adicionado ou removido
CREATE OR REPLACE FUNCTION trigger_update_user_consolidated_on_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM update_user_consolidated(NEW.user_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_user_consolidated(OLD.user_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_user_consolidated_on_admin_insert ON admin_users;
CREATE TRIGGER trg_update_user_consolidated_on_admin_insert
  AFTER INSERT ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_consolidated_on_admin();

DROP TRIGGER IF EXISTS trg_update_user_consolidated_on_admin_delete ON admin_users;
CREATE TRIGGER trg_update_user_consolidated_on_admin_delete
  AFTER DELETE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_consolidated_on_admin();

-- ============================================
-- POPULAR TABELA COM DADOS EXISTENTES
-- ============================================
-- Executar esta função para popular a tabela com todos os usuários existentes
CREATE OR REPLACE FUNCTION populate_user_consolidated()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_user_id UUID;
BEGIN
  FOR v_user_id IN SELECT id FROM profiles
  LOOP
    PERFORM update_user_consolidated(v_user_id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CONFIGURAR RLS (ROW LEVEL SECURITY)
-- ============================================

-- Habilitar RLS na tabela
ALTER TABLE user_consolidated ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seus próprios dados
CREATE POLICY "Users can view their own consolidated data"
  ON user_consolidated
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Administradores podem ver todos os dados
-- (Assumindo que você tem uma tabela admin_users ou similar)
CREATE POLICY "Admins can view all consolidated data"
  ON user_consolidated
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Política: Sistema pode inserir/atualizar (via service role)
-- Esta política permite que as funções do banco atualizem a tabela
CREATE POLICY "System can insert and update consolidated data"
  ON user_consolidated
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Alternativa: Se você quiser desabilitar RLS completamente (mais simples para desenvolvimento)
-- Descomente a linha abaixo e comente as políticas acima:
-- ALTER TABLE user_consolidated DISABLE ROW LEVEL SECURITY;

-- Comentários
COMMENT ON TABLE user_consolidated IS 'Tabela consolidada com todas as informações do usuário em um só lugar';
COMMENT ON FUNCTION update_user_consolidated(UUID) IS 'Atualiza os dados consolidados de um usuário específico';
COMMENT ON FUNCTION populate_user_consolidated() IS 'Popula a tabela consolidada com todos os usuários existentes';

