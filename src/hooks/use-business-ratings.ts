import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';

export interface BusinessRating {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

export interface BusinessRatingStats {
  average_rating: number;
  total_ratings: number;
}

interface UseBusinessRatingsResult {
  ratings: BusinessRating[];
  stats: BusinessRatingStats | null;
  isLoading: boolean;
  error: Error | null;
  createRating: (businessId: string, rating: number, comment?: string) => Promise<void>;
  hasUserRated: boolean;
  userRating: BusinessRating | null;
  refresh: () => Promise<void>;
}

export function useBusinessRatings(businessId: string | null): UseBusinessRatingsResult {
  const { user } = useSession();
  const [ratings, setRatings] = useState<BusinessRating[]>([]);
  const [stats, setStats] = useState<BusinessRatingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userRating, setUserRating] = useState<BusinessRating | null>(null);

  const fetchRatings = async () => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Buscar avaliações com informações do usuário
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('business_ratings')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;

      // Formatar dados das avaliações
      const formattedRatings: BusinessRating[] = (ratingsData || []).map((rating: any) => ({
        id: rating.id,
        business_id: rating.business_id,
        user_id: rating.user_id,
        rating: rating.rating,
        comment: rating.comment,
        created_at: rating.created_at,
        updated_at: rating.updated_at,
        user_name: rating.profiles
          ? `${rating.profiles.first_name || ''} ${rating.profiles.last_name || ''}`.trim() || 'Anônimo'
          : 'Anônimo',
        user_email: rating.profiles?.email || null,
      }));

      setRatings(formattedRatings);

      // Buscar estatísticas usando a view
      const { data: statsData, error: statsError } = await supabase
        .from('business_ratings_summary')
        .select('average_rating, total_ratings')
        .eq('business_id', businessId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        console.warn('Erro ao buscar estatísticas:', statsError);
      }

      if (statsData) {
        setStats({
          average_rating: parseFloat(statsData.average_rating) || 0,
          total_ratings: statsData.total_ratings || 0,
        });
      } else {
        setStats({
          average_rating: 0,
          total_ratings: 0,
        });
      }

      // Verificar se o usuário atual já avaliou
      if (user) {
        const userRatingData = formattedRatings.find(r => r.user_id === user.id);
        setUserRating(userRatingData || null);
      } else {
        setUserRating(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar avaliações'));
      console.error('Erro ao buscar avaliações:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [businessId, user]);

  const createRating = async (businessId: string, rating: number, comment?: string) => {
    if (!user) {
      throw new Error('Você precisa estar logado para avaliar um negócio');
    }

    try {
      const { data, error: insertError } = await supabase
        .from('business_ratings')
        .insert({
          business_id: businessId,
          user_id: user.id,
          rating,
          comment: comment || null,
        })
        .select()
        .single();

      if (insertError) {
        // Se já existe uma avaliação, atualizar
        if (insertError.code === '23505') {
          const { data: updateData, error: updateError } = await supabase
            .from('business_ratings')
            .update({
              rating,
              comment: comment || null,
              updated_at: new Date().toISOString(),
            })
            .eq('business_id', businessId)
            .eq('user_id', user.id)
            .select()
            .single();

          if (updateError) throw updateError;
          await fetchRatings();
          return;
        }
        throw insertError;
      }

      await fetchRatings();
    } catch (err) {
      console.error('Erro ao criar avaliação:', err);
      throw err;
    }
  };

  return {
    ratings,
    stats,
    isLoading,
    error,
    createRating,
    hasUserRated: !!userRating,
    userRating,
    refresh: fetchRatings,
  };
}

