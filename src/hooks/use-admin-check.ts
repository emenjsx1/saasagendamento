import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';

interface UseAdminCheckResult {
  isAdmin: boolean;
  isLoading: boolean;
}

export const useAdminCheck = (): UseAdminCheckResult => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isSessionLoading) return;

    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    const checkAdminStatus = async () => {
      setIsLoading(true);
      
      try {
        // Chama a função RPC (Remote Procedure Call) 'is_admin'
        const { data, error } = await supabase.rpc('is_admin');

        if (error) {
          console.error("Error checking admin status:", error);
          // Não mostramos toast de erro para o usuário final, apenas logamos
          setIsAdmin(false);
        } else {
          // O resultado da função RPC é um booleano
          setIsAdmin(data === true);
        }
      } catch (e) {
        console.error("RPC call failed:", e);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, isSessionLoading]);

  return {
    isAdmin,
    isLoading,
  };
};