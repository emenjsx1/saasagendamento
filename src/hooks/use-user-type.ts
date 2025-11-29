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
        const { data, error } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao verificar negócio:', error);
        }

        setHasBusiness(!!data);
      } catch (error) {
        console.error('Erro ao verificar tipo de usuário:', error);
        setHasBusiness(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserType();
  }, [user, isSessionLoading, isAdmin, isAdminLoading]);

  const userType: UserType = 
    isLoading || isSessionLoading || isAdminLoading
      ? 'loading'
      : isAdmin
      ? 'admin'
      : hasBusiness
      ? 'owner'
      : user
      ? 'client'
      : 'loading';

  return {
    userType,
    isLoading: isLoading || isSessionLoading || isAdminLoading,
    hasBusiness,
  };
}

