import { useState, useEffect } from 'react';
import { useSession } from '@/integrations/supabase/session-context';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/use-admin-check';

export type UserType = 'owner' | 'client' | 'admin' | 'loading';

interface UseUserTypeResult {
  userType: UserType;
  isLoading: boolean;
  hasBusiness: boolean;
}

export function useUserType(): UseUserTypeResult {
  const { user, isLoading: isSessionLoading } = useSession();
  const { isAdmin, isLoading: isAdminLoading } = useAdminCheck();
  const [hasBusiness, setHasBusiness] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserType = async () => {
      if (isSessionLoading || isAdminLoading) {
        return;
      }

      if (!user) {
        setIsLoading(false);
        return;
      }

      // Se for admin, retornar imediatamente
      if (isAdmin) {
        setHasBusiness(false);
        setIsLoading(false);
        return;
      }

      // Verificar se usuário tem negócio
      try {
        console.log('🔍 [useUserType] Verificando se usuário tem negócio:', { userId: user.id });
        
        const { data, error } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('❌ [useUserType] Erro ao verificar negócio:', error);
          setHasBusiness(false);
        } else {
          // Se data não for null, o usuário tem um negócio
          const hasBusinessValue = !!data;
          console.log('✅ [useUserType] Resultado da verificação:', { 
            hasBusiness: hasBusinessValue, 
            businessId: data?.id || null 
          });
          setHasBusiness(hasBusinessValue);
        }
      } catch (error) {
        console.error('❌ [useUserType] Erro ao verificar tipo de usuário:', error);
        setHasBusiness(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserType();
  }, [user, isSessionLoading, isAdmin, isAdminLoading]);

  // Calcular userType baseado no estado atual
  // IMPORTANTE: hasBusiness tem prioridade sobre tudo (exceto admin)
  const userType: UserType = 
    isLoading || isSessionLoading || isAdminLoading
      ? 'loading'
      : isAdmin
      ? 'admin'
      : hasBusiness  // Se tem negócio, SEMPRE é owner, mesmo que ainda esteja carregando outros dados
      ? 'owner'
      : user
      ? 'client'
      : 'loading';
  
  // Log para debug
  useEffect(() => {
    if (!isLoading && user) {
      console.log('🔍 [useUserType] Estado atual:', {
        userType,
        hasBusiness,
        isAdmin,
        isLoading,
        userId: user.id
      });
    }
  }, [userType, hasBusiness, isAdmin, isLoading, user]);

  return {
    userType,
    isLoading: isLoading || isSessionLoading || isAdminLoading,
    hasBusiness,
  };
}

