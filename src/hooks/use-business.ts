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
  phone: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  theme_color: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  slug: string | null; // Adicionado slug
}

interface UseBusinessResult {
  business: Business | null;
  businessId: string | null;
  businessSlug: string | null; // Adicionado businessSlug
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
        .select('id, name, description, address, working_hours, phone, logo_url, cover_photo_url, theme_color, instagram_url, facebook_url, slug')
        .eq('owner_id', user.id)
        .maybeSingle();

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
    businessSlug: business?.slug || null, // Retorna o slug
    isLoading,
    isRegistered: !!business,
  };
};