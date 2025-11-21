import { supabase } from '@/integrations/supabase/client';

/**
 * Interface consolidada com todas as informações do usuário
 * Esta interface corresponde à tabela user_consolidated no banco de dados
 */
export interface ConsolidatedUserData {
  // Dados do Profile
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  
  // Dados do Negócio (se houver)
  business_id: string | null;
  business_name: string | null;
  business_slug: string | null;
  
  // Dados da Assinatura
  subscription_id: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  subscription_created_at: string | null;
  trial_ends_at: string | null;
  
  // Dados do Pagamento (mais recente)
  payment_id: string | null;
  payment_amount: number | null;
  payment_status: string | null;
  payment_date: string | null;
  payment_method: string | null;
  
  // Role
  is_admin: boolean;
  is_owner: boolean;
  role: 'Admin' | 'Owner' | 'Client';
}

/**
 * Busca dados consolidados de um usuário específico
 * Tenta usar a tabela user_consolidated primeiro, se não existir, busca das tabelas originais
 */
export const getConsolidatedUserData = async (userId: string): Promise<ConsolidatedUserData | null> => {
  try {
    // Tentar buscar da tabela consolidada primeiro
    const { data: consolidated, error: consolidatedError } = await supabase
      .from('user_consolidated')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Verificar se o erro é porque a tabela não existe, está vazia, ou RLS bloqueou
    if (consolidatedError) {
      // 42P01 = relation does not exist (tabela não existe)
      // PGRST116 = no rows returned (tabela existe mas está vazia)
      // 42501 = insufficient_privilege (RLS bloqueou o acesso)
      if (consolidatedError.code === '42P01' || consolidatedError.code === 'PGRST116') {
        console.log('⚠️ Tabela user_consolidated não encontrada ou vazia, usando fallback para buscar das tabelas originais');
      } else if (consolidatedError.code === '42501' || consolidatedError.message?.includes('RLS') || consolidatedError.message?.includes('policy')) {
        console.warn('⚠️ Acesso bloqueado por RLS na tabela user_consolidated. Execute o script fix_user_consolidated_rls.sql no Supabase. Usando fallback...');
      } else {
        console.error('❌ Erro ao buscar da tabela consolidada:', consolidatedError);
      }
    }

    if (!consolidatedError && consolidated) {
      // Converter para o formato esperado
      return {
        user_id: consolidated.user_id,
        email: consolidated.email || '',
        first_name: consolidated.first_name,
        last_name: consolidated.last_name,
        phone: consolidated.phone,
        created_at: consolidated.created_at,
        business_id: consolidated.business_id,
        business_name: consolidated.business_name,
        business_slug: consolidated.business_slug,
        subscription_id: consolidated.subscription_id,
        plan_name: consolidated.plan_name,
        subscription_status: consolidated.subscription_status,
        subscription_created_at: consolidated.subscription_created_at,
        trial_ends_at: consolidated.trial_ends_at,
        payment_id: consolidated.payment_id,
        payment_amount: consolidated.payment_amount ? parseFloat(consolidated.payment_amount as any) : null,
        payment_status: consolidated.payment_status,
        payment_date: consolidated.payment_date,
        payment_method: consolidated.payment_method,
        is_admin: consolidated.is_admin || false,
        is_owner: consolidated.is_owner || false,
        role: (consolidated.role as 'Admin' | 'Owner' | 'Client') || 'Client',
      };
    }

    // Se a tabela consolidada não existe, buscar das tabelas originais (fallback)
    console.log('⚠️ Tabela user_consolidated não encontrada, usando fallback para buscar das tabelas originais');

    // 1. Buscar perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone, created_at')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('❌ Erro ao buscar perfil:', profileError);
      return null;
    }

    // 2. Buscar negócio (se houver)
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, slug')
      .eq('owner_id', userId)
      .maybeSingle();

    if (businessError) {
      console.error('❌ Erro ao buscar negócio:', businessError);
    }

    // 3. Buscar assinatura (mais recente)
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('id, plan_name, status, created_at, trial_ends_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      console.error('❌ Erro ao buscar assinatura:', subscriptionError);
    }

    // 4. Buscar pagamento (mais recente)
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, amount, status, payment_date, method')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      console.error('❌ Erro ao buscar pagamento:', paymentError);
    }

    // 5. Verificar se é admin
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    const is_admin = !!adminData;
    const is_owner = !!business;

    // 6. Determinar role
    let role: 'Admin' | 'Owner' | 'Client' = 'Client';
    if (is_admin) {
      role = 'Admin';
    } else if (is_owner) {
      role = 'Owner';
    }

    // 7. Consolidar dados
    const result: ConsolidatedUserData = {
      user_id: profile.id,
      email: profile.email || '',
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone,
      created_at: profile.created_at,
      
      business_id: business?.id || null,
      business_name: business?.name || null,
      business_slug: business?.slug || null,
      
      subscription_id: subscription?.id || null,
      plan_name: subscription?.plan_name || null,
      subscription_status: subscription?.status || null,
      subscription_created_at: subscription?.created_at || null,
      trial_ends_at: subscription?.trial_ends_at || null,
      
      payment_id: payment?.id || null,
      payment_amount: payment ? parseFloat(payment.amount as any) : null,
      payment_status: payment?.status || null,
      payment_date: payment?.payment_date || null,
      payment_method: payment?.method || null,
      
      is_admin,
      is_owner,
      role,
    };

    return result;
  } catch (error: any) {
    console.error('❌ Erro ao consolidar dados do usuário:', error);
    return null;
  }
};

/**
 * Busca dados consolidados de múltiplos usuários de uma vez
 * Tenta usar a tabela user_consolidated primeiro
 */
export const getConsolidatedUsersData = async (userIds: string[]): Promise<Map<string, ConsolidatedUserData>> => {
  const result = new Map<string, ConsolidatedUserData>();

  if (userIds.length === 0) {
    return result;
  }

  try {
    // Tentar buscar da tabela consolidada primeiro
    const { data: consolidatedData, error: consolidatedError } = await supabase
      .from('user_consolidated')
      .select('*')
      .in('user_id', userIds);

    // Verificar se o erro é porque a tabela não existe, está vazia, ou RLS bloqueou
    if (consolidatedError) {
      // 42P01 = relation does not exist (tabela não existe)
      // PGRST116 = no rows returned (tabela existe mas está vazia)
      // 42501 = insufficient_privilege (RLS bloqueou o acesso)
      if (consolidatedError.code === '42P01' || consolidatedError.code === 'PGRST116') {
        console.log('⚠️ Tabela user_consolidated não encontrada ou vazia, usando fallback para buscar das tabelas originais');
      } else if (consolidatedError.code === '42501' || consolidatedError.message?.includes('RLS') || consolidatedError.message?.includes('policy')) {
        console.warn('⚠️ Acesso bloqueado por RLS na tabela user_consolidated. Execute o script fix_user_consolidated_rls.sql no Supabase. Usando fallback...');
      } else {
        console.error('❌ Erro ao buscar da tabela consolidada:', consolidatedError);
      }
    }

    if (!consolidatedError && consolidatedData && consolidatedData.length > 0) {
      // Converter para o formato esperado
      consolidatedData.forEach((item: any) => {
        result.set(item.user_id, {
          user_id: item.user_id,
          email: item.email || '',
          first_name: item.first_name,
          last_name: item.last_name,
          phone: item.phone,
          created_at: item.created_at,
          business_id: item.business_id,
          business_name: item.business_name,
          business_slug: item.business_slug,
          subscription_id: item.subscription_id,
          plan_name: item.plan_name,
          subscription_status: item.subscription_status,
          subscription_created_at: item.subscription_created_at,
          trial_ends_at: item.trial_ends_at,
          payment_id: item.payment_id,
          payment_amount: item.payment_amount ? parseFloat(item.payment_amount as any) : null,
          payment_status: item.payment_status,
          payment_date: item.payment_date,
          payment_method: item.payment_method,
          is_admin: item.is_admin || false,
          is_owner: item.is_owner || false,
          role: (item.role as 'Admin' | 'Owner' | 'Client') || 'Client',
        });
      });

      console.log(`✅ Dados consolidados carregados da tabela user_consolidated: ${result.size} usuários`);
      return result;
    }

    // Se a tabela consolidada não existe ou não retornou dados, usar fallback
    console.log('⚠️ Tabela user_consolidated não encontrada ou vazia, usando fallback para buscar das tabelas originais');

    // 1. Buscar todos os perfis
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone, created_at')
      .in('id', userIds);

    if (profilesError || !profiles) {
      console.error('❌ Erro ao buscar perfis:', profilesError);
      return result;
    }

    // 2. Buscar todos os negócios
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name, slug, owner_id')
      .in('owner_id', userIds);

    if (businessesError) {
      console.error('❌ Erro ao buscar negócios:', businessesError);
    }

    // 3. Buscar todas as assinaturas (mais recente de cada usuário)
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan_name, status, created_at, trial_ends_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (subscriptionsError) {
      console.error('❌ Erro ao buscar assinaturas:', subscriptionsError);
    }

    // 4. Buscar todos os pagamentos (mais recente de cada usuário)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, user_id, amount, status, payment_date, method')
      .in('user_id', userIds)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('❌ Erro ao buscar pagamentos:', paymentsError);
    }

    // 5. Buscar administradores
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('user_id')
      .in('user_id', userIds);

    const adminIds = new Set(adminData?.map(a => a.user_id) || []);

    // 6. Criar mapas para lookup rápido
    const businessesMap = new Map();
    (businesses || []).forEach((b: any) => {
      if (!businessesMap.has(b.owner_id)) {
        businessesMap.set(b.owner_id, b);
      }
    });

    const subscriptionsMap = new Map();
    (subscriptions || []).forEach((s: any) => {
      if (!subscriptionsMap.has(s.user_id)) {
        subscriptionsMap.set(s.user_id, s);
      }
    });

    const paymentsMap = new Map();
    (payments || []).forEach((p: any) => {
      if (!paymentsMap.has(p.user_id)) {
        paymentsMap.set(p.user_id, p);
      }
    });

    // 7. Consolidar dados para cada perfil
    profiles.forEach((profile: any) => {
      const business = businessesMap.get(profile.id);
      const subscription = subscriptionsMap.get(profile.id);
      const payment = paymentsMap.get(profile.id);
      const is_admin = adminIds.has(profile.id);
      const is_owner = !!business;

      let role: 'Admin' | 'Owner' | 'Client' = 'Client';
      if (is_admin) {
        role = 'Admin';
      } else if (is_owner) {
        role = 'Owner';
      }

      const consolidated: ConsolidatedUserData = {
        user_id: profile.id,
        email: profile.email || '',
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        created_at: profile.created_at,
        
        business_id: business?.id || null,
        business_name: business?.name || null,
        business_slug: business?.slug || null,
        
        subscription_id: subscription?.id || null,
        plan_name: subscription?.plan_name || null,
        subscription_status: subscription?.status || null,
        subscription_created_at: subscription?.created_at || null,
        trial_ends_at: subscription?.trial_ends_at || null,
        
        payment_id: payment?.id || null,
        payment_amount: payment ? parseFloat(payment.amount as any) : null,
        payment_status: payment?.status || null,
        payment_date: payment?.payment_date || null,
        payment_method: payment?.method || null,
        
        is_admin,
        is_owner,
        role,
      };

      result.set(profile.id, consolidated);
    });

    console.log(`✅ Dados consolidados carregados (fallback): ${result.size} usuários`);
    return result;
  } catch (error: any) {
    console.error('❌ Erro ao consolidar dados dos usuários:', error);
    return result;
  }
};

/**
 * Função para atualizar manualmente os dados consolidados de um usuário
 * Útil quando você quer forçar uma atualização
 */
export const refreshConsolidatedUserData = async (userId: string): Promise<boolean> => {
  try {
    // Chamar a função RPC do Supabase que atualiza os dados consolidados
    const { error } = await supabase.rpc('update_user_consolidated', {
      p_user_id: userId,
    });

    if (error) {
      console.error('❌ Erro ao atualizar dados consolidados:', error);
      return false;
    }

    console.log('✅ Dados consolidados atualizados para usuário:', userId);
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao atualizar dados consolidados:', error);
    return false;
  }
};
