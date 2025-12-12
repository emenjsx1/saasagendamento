import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClientInteraction {
  id: string;
  client_id: string;
  business_id: string;
  interaction_type: 'appointment' | 'call' | 'email' | 'message' | 'note' | 'payment' | 'meeting' | 'other';
  title: string | null;
  description: string | null;
  appointment_id: string | null;
  payment_id: string | null;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UseClientInteractionsOptions {
  clientId?: string;
  businessId?: string;
  interactionType?: string;
  limit?: number;
}

export function useClientInteractions(options: UseClientInteractionsOptions = {}) {
  const [interactions, setInteractions] = useState<ClientInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchInteractions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let query = supabase
          .from('client_interactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (options.clientId) {
          query = query.eq('client_id', options.clientId);
        }

        if (options.businessId) {
          query = query.eq('business_id', options.businessId);
        }

        if (options.interactionType) {
          query = query.eq('interaction_type', options.interactionType);
        }

        if (options.limit) {
          query = query.limit(options.limit);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;

        setInteractions(data || []);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching interactions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInteractions();
  }, [options.clientId, options.businessId, options.interactionType, options.limit]);

  const createInteraction = async (interactionData: Omit<ClientInteraction, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('client_interactions')
      .insert(interactionData)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  return {
    interactions,
    isLoading,
    error,
    createInteraction,
  };
}


