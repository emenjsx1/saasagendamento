import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessCategory } from '@/utils/mozambique-locations';

export interface MarketplaceBusiness {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  slug: string | null;
  average_rating: number;
  total_ratings: number;
  theme_color: string | null;
}

interface UseMarketplaceFilters {
  category?: BusinessCategory | 'all';
  province?: string | 'all';
  searchQuery?: string;
  sortBy?: 'rating' | 'name' | 'newest';
}

interface UseMarketplaceResult {
  businesses: MarketplaceBusiness[];
  isLoading: boolean;
  error: Error | null;
  totalCount: number;
  refresh: () => Promise<void>;
}

export function useMarketplace(filters: UseMarketplaceFilters = {}): UseMarketplaceResult {
  const [businesses, setBusinesses] = useState<MarketplaceBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchBusinesses = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Construir query base
      let query = supabase
        .from('businesses')
        .select(`
          id,
          name,
          description,
          category,
          province,
          city,
          address,
          phone,
          logo_url,
          cover_photo_url,
          slug,
          theme_color,
          created_at
        `, { count: 'exact' })
        .eq('is_public', true);

      // Aplicar filtros
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.province && filters.province !== 'all') {
        query = query.eq('province', filters.province);
      }

      if (filters.searchQuery) {
        query = query.or(`name.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
      }

      // Aplicar ordenação
      if (filters.sortBy === 'rating') {
        // Ordenação por rating será feita após buscar os ratings
        query = query.order('created_at', { ascending: false });
      } else if (filters.sortBy === 'name') {
        query = query.order('name', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data: businessesData, error: businessesError, count } = await query;

      if (businessesError) throw businessesError;

      setTotalCount(count || 0);

      if (!businessesData || businessesData.length === 0) {
        setBusinesses([]);
        setIsLoading(false);
        return;
      }

      // Buscar ratings para cada negócio
      const businessIds = businessesData.map(b => b.id);
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('business_ratings_summary')
        .select('business_id, average_rating, total_ratings')
        .in('business_id', businessIds);

      if (ratingsError) {
        console.warn('Erro ao buscar ratings:', ratingsError);
      }

      // Criar mapa de ratings por business_id
      const ratingsMap = new Map<string, { average_rating: number; total_ratings: number }>();
      (ratingsData || []).forEach((rating: any) => {
        ratingsMap.set(rating.business_id, {
          average_rating: parseFloat(rating.average_rating) || 0,
          total_ratings: rating.total_ratings || 0,
        });
      });

      // Combinar dados de negócios com ratings
      let combinedBusinesses: MarketplaceBusiness[] = businessesData.map((business: any) => {
        const rating = ratingsMap.get(business.id) || { average_rating: 0, total_ratings: 0 };
        return {
          id: business.id,
          name: business.name,
          description: business.description,
          category: business.category,
          province: business.province,
          city: business.city,
          address: business.address,
          phone: business.phone,
          logo_url: business.logo_url,
          cover_photo_url: business.cover_photo_url,
          slug: business.slug,
          theme_color: business.theme_color,
          average_rating: rating.average_rating,
          total_ratings: rating.total_ratings,
        };
      });

      // Ordenar por rating se necessário
      if (filters.sortBy === 'rating') {
        combinedBusinesses = combinedBusinesses.sort((a, b) => {
          if (b.average_rating !== a.average_rating) {
            return b.average_rating - a.average_rating;
          }
          return b.total_ratings - a.total_ratings;
        });
      }

      setBusinesses(combinedBusinesses);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar negócios'));
      console.error('Erro ao buscar negócios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.province, filters.searchQuery, filters.sortBy]);

  return {
    businesses,
    isLoading,
    error,
    totalCount,
    refresh: fetchBusinesses,
  };
}

