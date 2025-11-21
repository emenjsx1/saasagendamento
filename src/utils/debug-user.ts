import { supabase } from '@/integrations/supabase/client';

/**
 * Função de debug para verificar um usuário específico em todas as tabelas
 */
export const debugUser = async (userId: string) => {
  console.log('🔍 ===== DEBUG DO USUÁRIO =====');
  console.log('ID do Usuário:', userId);
  console.log('');

  try {
    // 1. Verificar na tabela profiles
    console.log('📋 1. Verificando na tabela PROFILES...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Erro ao buscar perfil:', profileError);
    } else if (profileData) {
      console.log('✅ Perfil encontrado:', {
        id: profileData.id,
        email: profileData.email,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        created_at: profileData.created_at,
      });
    } else {
      console.log('⚠️ Perfil NÃO encontrado na tabela profiles');
    }
    console.log('');

    // 2. Verificar na tabela businesses
    console.log('📋 2. Verificando na tabela BUSINESSES...');
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', userId);

    if (businessError) {
      console.error('❌ Erro ao buscar negócios:', businessError);
    } else if (businessData && businessData.length > 0) {
      console.log('✅ Negócios encontrados:', businessData.map(b => ({
        id: b.id,
        name: b.name,
        owner_id: b.owner_id,
      })));
    } else {
      console.log('⚠️ Nenhum negócio encontrado para este usuário');
    }
    console.log('');

    // 3. Verificar na tabela payments
    console.log('📋 3. Verificando na tabela PAYMENTS...');
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('❌ Erro ao buscar pagamentos:', paymentsError);
    } else if (paymentsData && paymentsData.length > 0) {
      console.log(`✅ ${paymentsData.length} pagamento(s) encontrado(s):`);
      paymentsData.forEach((p, index) => {
        console.log(`   Pagamento ${index + 1}:`, {
          id: p.id,
          amount: p.amount,
          status: p.status,
          payment_date: p.payment_date,
          method: p.method,
          payment_type: p.payment_type,
          transaction_id: p.transaction_id,
          user_id: p.user_id,
          business_id: p.business_id,
        });
      });
    } else {
      console.log('⚠️ Nenhum pagamento encontrado para este usuário');
    }
    console.log('');

    // 4. Verificar na tabela subscriptions
    console.log('📋 4. Verificando na tabela SUBSCRIPTIONS...');
    const { data: subscriptionsData, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (subscriptionsError) {
      console.error('❌ Erro ao buscar assinaturas:', subscriptionsError);
    } else if (subscriptionsData && subscriptionsData.length > 0) {
      console.log(`✅ ${subscriptionsData.length} assinatura(s) encontrada(s):`);
      subscriptionsData.forEach((s, index) => {
        console.log(`   Assinatura ${index + 1}:`, {
          id: s.id,
          user_id: s.user_id,
          plan_name: s.plan_name,
          status: s.status,
          trial_ends_at: s.trial_ends_at,
          created_at: s.created_at,
        });
      });
    } else {
      console.log('⚠️ Nenhuma assinatura encontrada para este usuário');
    }
    console.log('');

    // 5. Verificar se há outros pagamentos com esse user_id
    console.log('📋 5. Verificando outros pagamentos com mesmo user_id...');
    const { data: allPaymentsData } = await supabase
      .from('payments')
      .select('id, user_id, amount, status')
      .eq('user_id', userId);
    
    if (allPaymentsData && allPaymentsData.length > 0) {
      console.log(`✅ Total de ${allPaymentsData.length} pagamento(s) com esse user_id`);
    }
    console.log('');

    // 6. Resumo
    console.log('📊 ===== RESUMO =====');
    console.log('Perfil:', profileData ? '✅ Encontrado' : '❌ Não encontrado');
    console.log('Negócios:', businessData && businessData.length > 0 ? `✅ ${businessData.length} encontrado(s)` : '❌ Nenhum');
    console.log('Pagamentos:', paymentsData && paymentsData.length > 0 ? `✅ ${paymentsData.length} encontrado(s)` : '❌ Nenhum');
    console.log('Assinaturas:', subscriptionsData && subscriptionsData.length > 0 ? `✅ ${subscriptionsData.length} encontrada(s)` : '❌ Nenhuma');
    console.log('');
    console.log('⚠️ PROBLEMA IDENTIFICADO:');
    if (!profileData) {
      console.log('   - O user_id do pagamento não existe na tabela profiles');
      console.log('   - Isso pode acontecer se o usuário foi deletado ou o ID está incorreto');
      console.log('   - SOLUÇÃO: Verificar se o user_id está correto ou criar o perfil faltante');
    }
    if (!subscriptionsData || subscriptionsData.length === 0) {
      console.log('   - Não há assinatura registrada para este user_id');
      console.log('   - O pagamento pode ter sido feito antes da criação da assinatura');
    }
    console.log('====================');

    return {
      profile: profileData,
      businesses: businessData || [],
      payments: paymentsData || [],
      subscriptions: subscriptionsData || [],
    };
  } catch (error: any) {
    console.error('❌ Erro geral no debug:', error);
    throw error;
  }
};

