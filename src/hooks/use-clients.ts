import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Client {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | 'blocked';
  tags: string[];
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UseClientsOptions {
  businessId?: string;
  search?: string;
  tags?: string[];
  status?: string;
  limit?: number;
  offset?: number;
}

export function useClients(options: UseClientsOptions = {}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!options.businessId) {
      setIsLoading(false);
      return;
    }

    const fetchClients = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let query = supabase
          .from('clients')
          .select('*', { count: 'exact' })
          .eq('business_id', options.businessId);

        // Aplicar filtros
        if (options.search) {
          query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%,phone.ilike.%${options.search}%`);
        }

        if (options.status) {
          query = query.eq('status', options.status);
        }

        if (options.tags && options.tags.length > 0) {
          query = query.contains('tags', options.tags);
        }

        // Ordenação
        query = query.order('created_at', { ascending: false });

        // Paginação
        if (options.limit) {
          query = query.limit(options.limit);
        }
        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        const { data, error: queryError, count } = await query;

        if (queryError) throw queryError;

        setClients(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching clients:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [options.businessId, options.search, options.status, options.tags, options.limit, options.offset]);

  const createClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  const addTag = async (id: string, tag: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) throw new Error('Client not found');

    const newTags = [...(client.tags || []), tag];
    return updateClient(id, { tags: newTags });
  };

  const removeTag = async (id: string, tag: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) throw new Error('Client not found');

    const newTags = (client.tags || []).filter(t => t !== tag);
    return updateClient(id, { tags: newTags });
  };

  const refetch = () => {
    // Force re-fetch by clearing and re-triggering
    setClients([]);
    setIsLoading(true);
  };

  return {
    clients,
    isLoading,
    error,
    totalCount,
    createClient,
    updateClient,
    deleteClient,
    addTag,
    removeTag,
    refetch,
  };
}

