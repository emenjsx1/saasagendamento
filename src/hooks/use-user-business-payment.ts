import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/integrations/supabase/session-context';

export interface UserBusinessPaymentInfo {
  // User Info
  user_id: string;
  user_name: string;
  user_email: string;
  
  // Business Info
  business_id: string | null;
  business_name: string | null;
  
  // Payment Info
  payment_id: string | null;
  amount_paid: number | null;
  payment_status: string | null;
  payment_date: string | null;
  payment_method: string | null;
  
  // Subscription Info
  subscription_id: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  subscription_renewal_date: string | null;
  trial_ends_at: string | null;
}

export const useUserBusinessPayment = (userId: string | null) => {
  const { user: currentUser } = useSession();
  const [info, setInfo] = useState<UserBusinessPaymentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserBusinessPayment = async () => {
      // Se não há userId fornecido, usar o usuário atual logado
      const targetUserId = userId || currentUser?.id || null;
      
      if (!targetUserId) {
        setInfo(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('🔍 Buscando informações do usuário:', { 
          targetUserId, 
          providedUserId: userId, 
          currentUserId: currentUser?.id,
          note: 'O ID usado deve corresponder ao auth.users.id que é o mesmo que profiles.id'
        });

        // IMPORTANTE: A identificação do usuário funciona assim:
        // 1. auth.users.id (do Supabase Auth) = profiles.id (tabela profiles)
        // 2. profiles.id = businesses.owner_id (tabela businesses)
        // 3. profiles.id = payments.user_id (tabela payments)
        // 4. profiles.id = subscriptions.user_id (tabela subscriptions)
        
        // 1. Verificar o usuário na tabela profiles usando o ID da autenticação
        // O user.id do Supabase auth corresponde ao id na tabela profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .eq('id', targetUserId) // targetUserId = auth.users.id = profiles.id
          .single();

        if (profileError) {
          console.error('❌ Erro ao buscar perfil:', profileError);
          throw new Error(`Erro ao buscar perfil: ${profileError.message}`);
        }

        if (!profileData) {
          console.error('❌ Perfil não encontrado para ID:', targetUserId);
          throw new Error('Usuário não encontrado na tabela profiles');
        }

        console.log('✅ Perfil encontrado:', { id: profileData.id, name: `${profileData.first_name} ${profileData.last_name}`, email: profileData.email });

        const userName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'N/A';
        const userEmail = profileData.email || 'N/A';

        // 2. Verificar o negócio associado ao usuário
        // O owner_id na tabela businesses corresponde ao id do profile (que é o mesmo do auth.users)
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id, name, owner_id')
          .eq('owner_id', targetUserId) // owner_id = profiles.id = auth.users.id
          .maybeSingle();

        if (businessError) {
          console.error('Erro ao buscar negócio:', businessError);
        }

        const businessId = businessData?.id || null;
        const businessName = businessData?.name || null;

        if (businessData) {
          console.log('✅ Negócio encontrado:', { id: businessData.id, name: businessData.name });
        }

        // 3. Verificar o pagamento mais recente do usuário
        // O user_id na tabela payments corresponde ao id do profile (que é o mesmo do auth.users)
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .select('id, amount, status, payment_date, method, payment_type')
          .eq('user_id', targetUserId) // user_id = profiles.id = auth.users.id
          .order('payment_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (paymentError) {
          console.error('Erro ao buscar pagamento:', paymentError);
        }

        const paymentId = paymentData?.id || null;
        const amountPaid = paymentData ? parseFloat(paymentData.amount as any) : null;
        const paymentStatus = paymentData?.status || null;
        const paymentDate = paymentData?.payment_date || null;
        const paymentMethod = paymentData?.method || null;

        if (paymentData) {
          console.log('✅ Pagamento encontrado:', { id: paymentData.id, amount: paymentData.amount, status: paymentData.status });
        }

        // 4. Verificar a assinatura ativa do usuário
        // O user_id na tabela subscriptions corresponde ao id do profile (que é o mesmo do auth.users)
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('id, plan_name, status, trial_ends_at, created_at')
          .eq('user_id', targetUserId) // user_id = profiles.id = auth.users.id
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subscriptionError) {
          console.error('Erro ao buscar assinatura:', subscriptionError);
        }

        const subscriptionId = subscriptionData?.id || null;
        const planName = subscriptionData?.plan_name || null;
        const subscriptionStatus = subscriptionData?.status || null;
        const trialEndsAt = subscriptionData?.trial_ends_at || null;
        const subscriptionRenewalDate = subscriptionData?.trial_ends_at || null;

        if (subscriptionData) {
          console.log('✅ Assinatura encontrada:', { id: subscriptionData.id, plan: subscriptionData.plan_name, status: subscriptionData.status });
        }

        // Consolidar todas as informações
        const consolidatedInfo: UserBusinessPaymentInfo = {
          user_id: targetUserId,
          user_name: userName,
          user_email: userEmail,
          business_id: businessId,
          business_name: businessName,
          payment_id: paymentId,
          amount_paid: amountPaid,
          payment_status: paymentStatus,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          subscription_id: subscriptionId,
          plan_name: planName,
          subscription_status: subscriptionStatus,
          subscription_renewal_date: subscriptionRenewalDate,
          trial_ends_at: trialEndsAt,
        };

        setInfo(consolidatedInfo);
      } catch (err: any) {
        console.error('Erro ao buscar informações do usuário:', err);
        setError(err.message || 'Erro ao buscar informações');
        toast.error(`Erro: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserBusinessPayment();
  }, [userId, currentUser?.id]);

  return { info, isLoading, error };
};

/**
 * Hook para obter informações do usuário atual logado
 * Usa automaticamente o usuário da sessão de autenticação
 */
export const useCurrentUserBusinessPayment = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const { info, isLoading, error } = useUserBusinessPayment(user?.id || null);

  return {
    info,
    isLoading: isLoading || isSessionLoading,
    error,
    user,
  };
};

