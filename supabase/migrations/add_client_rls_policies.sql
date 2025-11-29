-- ============================================
-- POLÍTICAS RLS PARA AGENDAMENTOS DE CLIENTES
-- ============================================

-- Habilitar RLS na tabela appointments (se ainda não estiver habilitado)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Política: Clientes podem ver seus próprios agendamentos
-- (agendamentos onde user_id = auth.uid())
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'appointments_select_own'
  ) THEN
    CREATE POLICY "appointments_select_own"
    ON appointments
    FOR SELECT
    USING (
      user_id = auth.uid() OR
      -- Também permitir se o email do agendamento corresponde ao email do usuário
      (client_email IS NOT NULL AND client_email = (SELECT email FROM profiles WHERE id = auth.uid()))
    );
  END IF;
END $$;

-- Política: Clientes podem criar seus próprios agendamentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'appointments_insert_own'
  ) THEN
    CREATE POLICY "appointments_insert_own"
    ON appointments
    FOR INSERT
    WITH CHECK (
      user_id = auth.uid() OR
      user_id IS NULL -- Permitir criar sem user_id (para clientes não autenticados)
    );
  END IF;
END $$;

-- Política: Clientes podem atualizar seus próprios agendamentos
-- (permitir atualizar campos como is_rated)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'appointments_update_own'
  ) THEN
    CREATE POLICY "appointments_update_own"
    ON appointments
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Nota: As políticas para donos de negócio e admin já devem existir
-- Esta migration adiciona apenas as políticas específicas para clientes

