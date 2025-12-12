import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SalesDeal {
  id: string;
  business_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  stage: 'lead' | 'proposal' | 'negotiation' | 'closed' | 'lost';
  value: number;
  probability: number;
  expected_close_date: string | null;
  assigned_to: string | null;
  tags: string[];
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_reason: string | null;
}

interface UseSalesPipelineOptions {
  businessId?: string;
  stage?: string;
  assignedTo?: string;
}

export function useSalesPipeline(options: UseSalesPipelineOptions = {}) {
  const [deals, setDeals] = useState<SalesDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!options.businessId) {
      setIsLoading(false);
      return;
    }

    const fetchPipeline = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let query = supabase
          .from('sales_pipeline')
          .select('*')
          .eq('business_id', options.businessId)
          .order('created_at', { ascending: false });

        if (options.stage) {
          query = query.eq('stage', options.stage);
        }

        if (options.assignedTo) {
          query = query.eq('assigned_to', options.assignedTo);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;

        setDeals(data || []);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching pipeline:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPipeline();
  }, [options.businessId, options.stage, options.assignedTo]);

  const createDeal = async (dealData: Omit<SalesDeal, 'id' | 'created_at' | 'updated_at' | 'closed_at' | 'closed_reason'>) => {
    const { data, error } = await supabase
      .from('sales_pipeline')
      .insert(dealData)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updateDeal = async (id: string, updates: Partial<SalesDeal>) => {
    const { data, error } = await supabase
      .from('sales_pipeline')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const moveDeal = async (id: string, newStage: SalesDeal['stage']) => {
    const updates: Partial<SalesDeal> = { stage: newStage };
    
    if (newStage === 'closed' || newStage === 'lost') {
      updates.closed_at = new Date().toISOString();
    }

    return updateDeal(id, updates);
  };

  const deleteDeal = async (id: string) => {
    const { error } = await supabase
      .from('sales_pipeline')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  return {
    deals,
    isLoading,
    error,
    createDeal,
    updateDeal,
    moveDeal,
    deleteDeal,
  };
}


