/**
 * Utilitários para integração do CRM com o sistema
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Encontra ou cria um cliente baseado nos dados do agendamento
 */
export async function findOrCreateClient(
  businessId: string,
  clientData: {
    name: string;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  }
): Promise<string | null> {
  try {
    // Tentar encontrar cliente existente
    let existingClient = null;

    // Primeiro, tentar por email (se existir)
    if (clientData.email) {
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('business_id', businessId)
        .eq('email', clientData.email)
        .maybeSingle();
      existingClient = data;
    }

    // Se não encontrou por email, tentar por telefone/whatsapp
    if (!existingClient && (clientData.whatsapp || clientData.phone)) {
      const phone = clientData.whatsapp || clientData.phone;
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('business_id', businessId)
        .or(`whatsapp.eq.${phone},phone.eq.${phone}`)
        .maybeSingle();
      existingClient = data;
    }

    // Se ainda não encontrou, tentar apenas por nome (última tentativa)
    if (!existingClient) {
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('business_id', businessId)
        .eq('name', clientData.name)
        .maybeSingle();
      existingClient = data;
    }

    if (existingClient) {
      return existingClient.id;
    }

    // Se não encontrou, criar novo cliente
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        business_id: businessId,
        name: clientData.name,
        email: clientData.email || null,
        phone: clientData.phone || null,
        whatsapp: clientData.whatsapp || null,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao criar cliente:', error);
      return null;
    }

    return newClient.id;
  } catch (error) {
    console.error('Erro ao encontrar/criar cliente:', error);
    return null;
  }
}

/**
 * Cria uma interação automaticamente
 */
export async function createInteraction(
  clientId: string,
  businessId: string,
  interactionData: {
    interaction_type: 'appointment' | 'call' | 'email' | 'message' | 'note' | 'payment' | 'meeting' | 'other';
    title: string;
    description?: string | null;
    appointment_id?: string | null;
    payment_id?: string | null;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('client_interactions')
      .insert({
        client_id: clientId,
        business_id: businessId,
        ...interactionData,
      });

    if (error) {
      console.error('Erro ao criar interação:', error);
    }
  } catch (error) {
    console.error('Erro ao criar interação:', error);
  }
}

/**
 * Linka um agendamento com um cliente e cria interação
 */
export async function linkAppointmentToClient(
  appointmentId: string,
  businessId: string,
  clientData: {
    name: string;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  },
  appointmentDetails: {
    service_name: string;
    start_time: string;
    status: string;
  }
): Promise<void> {
  try {
    // Encontrar ou criar cliente
    const clientId = await findOrCreateClient(businessId, clientData);

    if (!clientId) {
      console.warn('Não foi possível encontrar/criar cliente para o agendamento');
      return;
    }

    // Criar interação baseada no status do agendamento
    let title = 'Agendamento';
    let description = `Agendamento de ${appointmentDetails.service_name}`;

    switch (appointmentDetails.status) {
      case 'pending':
        title = 'Agendamento Pendente';
        description = `Agendamento pendente de ${appointmentDetails.service_name}`;
        break;
      case 'confirmed':
        title = 'Agendamento Confirmado';
        description = `Agendamento confirmado de ${appointmentDetails.service_name}`;
        break;
      case 'completed':
        title = 'Atendimento Concluído';
        description = `Atendimento concluído: ${appointmentDetails.service_name}`;
        break;
      case 'cancelled':
        title = 'Agendamento Cancelado';
        description = `Agendamento cancelado: ${appointmentDetails.service_name}`;
        break;
    }

    await createInteraction(clientId, businessId, {
      interaction_type: 'appointment',
      title,
      description,
      appointment_id: appointmentId,
      metadata: {
        service_name: appointmentDetails.service_name,
        start_time: appointmentDetails.start_time,
        status: appointmentDetails.status,
      },
    });
  } catch (error) {
    console.error('Erro ao linkar agendamento com cliente:', error);
  }
}

/**
 * Linka um pagamento com um cliente e cria interação
 */
export async function linkPaymentToClient(
  paymentId: string,
  businessId: string,
  clientData: {
    name: string;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  },
  paymentDetails: {
    amount: number;
    method: string;
    payment_date: string;
  }
): Promise<void> {
  try {
    // Encontrar ou criar cliente
    const clientId = await findOrCreateClient(businessId, clientData);

    if (!clientId) {
      console.warn('Não foi possível encontrar/criar cliente para o pagamento');
      return;
    }

    // Criar interação de pagamento
    await createInteraction(clientId, businessId, {
      interaction_type: 'payment',
      title: 'Pagamento Recebido',
      description: `Pagamento de ${paymentDetails.amount} MZN via ${paymentDetails.method}`,
      payment_id: paymentId,
      metadata: {
        amount: paymentDetails.amount,
        method: paymentDetails.method,
        payment_date: paymentDetails.payment_date,
      },
    });
  } catch (error) {
    console.error('Erro ao linkar pagamento com cliente:', error);
  }
}

