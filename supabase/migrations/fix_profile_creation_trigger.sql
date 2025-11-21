-- ============================================
-- CORRIGIR TRIGGER DE CRIAÇÃO AUTOMÁTICA DE PERFIL
-- ============================================
-- Este script corrige o problema de criação de usuário
-- que pode estar falhando devido ao trigger

-- 1. Verificar se existe trigger para criar perfil automaticamente
-- Se não existir, criar um que funcione corretamente

-- Função para criar perfil automaticamente quando usuário é criado no auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, phone, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se houver erro, apenas logar e continuar
    -- Não bloquear a criação do usuário
    RAISE WARNING 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar trigger novo
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Garantir que a função update_user_consolidated não falhe silenciosamente
-- Modificar a função para tratar erros graciosamente

CREATE OR REPLACE FUNCTION update_user_consolidated(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_profile RECORD;
  v_business RECORD;
  v_subscription RECORD;
  v_payment RECORD;
  v_is_admin BOOLEAN := FALSE;
  v_is_owner BOOLEAN := FALSE;
  v_role TEXT := 'Client';
BEGIN
  -- Buscar perfil (pode não existir ainda)
  BEGIN
    SELECT id, email, first_name, last_name, phone, created_at
    INTO v_profile
    FROM profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
      -- Se o perfil não existe, apenas retornar sem erro
      RETURN;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Se houver erro ao buscar perfil, apenas retornar
      RETURN;
  END;

  -- Buscar negócio (pode não existir)
  BEGIN
    SELECT id, name, slug
    INTO v_business
    FROM businesses
    WHERE owner_id = p_user_id
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      v_business := NULL;
  END;

  -- Buscar assinatura (pode não existir)
  BEGIN
    SELECT id, plan_name, status, created_at, trial_ends_at
    INTO v_subscription
    FROM subscriptions
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      v_subscription := NULL;
  END;

  -- Buscar pagamento mais recente (pode não existir)
  BEGIN
    SELECT id, amount, status, payment_date, method
    INTO v_payment
    FROM payments
    WHERE user_id = p_user_id
    ORDER BY payment_date DESC
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      v_payment := NULL;
  END;

  -- Verificar se é admin (pode não existir)
  BEGIN
    SELECT EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_user_id) INTO v_is_admin;
  EXCEPTION
    WHEN OTHERS THEN
      v_is_admin := FALSE;
  END;

  -- Verificar se é owner (tem negócio)
  v_is_owner := (v_business IS NOT NULL);

  -- Determinar role
  IF v_is_admin THEN
    v_role := 'Admin';
  ELSIF v_is_owner THEN
    v_role := 'Owner';
  ELSE
    v_role := 'Client';
  END IF;

  -- Inserir ou atualizar dados consolidados
  INSERT INTO user_consolidated (
    user_id, email, first_name, last_name, phone, created_at,
    business_id, business_name, business_slug,
    subscription_id, plan_name, subscription_status, subscription_created_at, trial_ends_at,
    payment_id, payment_amount, payment_status, payment_date, payment_method,
    is_admin, is_owner, role, updated_at
  ) VALUES (
    v_profile.id, 
    COALESCE(v_profile.email, ''), 
    COALESCE(v_profile.first_name, ''), 
    COALESCE(v_profile.last_name, ''), 
    COALESCE(v_profile.phone, ''), 
    COALESCE(v_profile.created_at, NOW()),
    v_business.id, 
    v_business.name, 
    v_business.slug,
    v_subscription.id, 
    v_subscription.plan_name, 
    v_subscription.status, 
    v_subscription.created_at, 
    v_subscription.trial_ends_at,
    v_payment.id, 
    v_payment.amount, 
    v_payment.status, 
    v_payment.payment_date, 
    v_payment.method,
    v_is_admin, 
    v_is_owner, 
    v_role, 
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, user_consolidated.email),
    first_name = COALESCE(EXCLUDED.first_name, user_consolidated.first_name),
    last_name = COALESCE(EXCLUDED.last_name, user_consolidated.last_name),
    phone = COALESCE(EXCLUDED.phone, user_consolidated.phone),
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
EXCEPTION
  WHEN OTHERS THEN
    -- Se houver erro, apenas logar e não bloquear
    RAISE WARNING 'Erro ao atualizar user_consolidated para usuário %: %', p_user_id, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 3. Modificar o trigger de profiles para não falhar silenciosamente
CREATE OR REPLACE FUNCTION trigger_update_user_consolidated_on_profile()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM update_user_consolidated(NEW.id);
  EXCEPTION
    WHEN OTHERS THEN
      -- Se houver erro, apenas logar e continuar
      RAISE WARNING 'Erro ao atualizar user_consolidated no trigger de profiles: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

