import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';

interface Business {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  working_hours: any; // Assuming JSONB structure
}

interface UseBusinessResult {
  business: Business | null;
  businessId: string | null;
  isLoading: boolean;
  isRegistered: boolean;
}

export const useBusiness = (): UseBusinessResult => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isSessionLoading || !user) {
      if (!isSessionLoading) setIsLoading(false);
      return;
    }

    const fetchBusiness = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, description, address, working_hours')
        .eq('owner_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        toast.error("Erro ao carregar dados do negócio.");
        console.error(error);
        setBusiness(null);
      } else if (data) {
        setBusiness(data as Business);
      } else {
        setBusiness(null);
      }
      setIsLoading(false);
    };

    fetchBusiness();
  }, [user, isSessionLoading]);

  return {
    business,
    businessId: business?.id || null,
    isLoading,
    isRegistered: !!business,
  };
};