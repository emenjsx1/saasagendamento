import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inicializa o cliente Supabase com a chave de serviço para acesso irrestrito ao DB
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentId, newStatus } = await req.json();

    if (!appointmentId || !newStatus) {
      return new Response(JSON.stringify({ error: 'Missing appointmentId or newStatus' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Buscar detalhes do agendamento
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select(`
        client_name,
        client_whatsapp,
        start_time,
        status,
        services (name),
        businesses (name)
      `)
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      console.error("Error fetching appointment:", fetchError);
      return new Response(JSON.stringify({ error: 'Appointment not found or database error.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceName = Array.isArray(appointment.services) ? appointment.services[0].name : appointment.services.name;
    const businessName = Array.isArray(appointment.businesses) ? appointment.businesses[0].name : appointment.businesses.name;
    const startTime = new Date(appointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const date = new Date(appointment.start_time).toLocaleDateString('pt-BR');

    let messageBody = '';
    let subject = '';

    if (newStatus === 'confirmed') {
      subject = 'Agendamento Confirmado!';
      messageBody = `Olá, ${appointment.client_name}! Seu agendamento para ${serviceName} com ${businessName} no dia ${date} às ${startTime} foi CONFIRMADO. Te esperamos!`;
    } else if (newStatus === 'rejected') {
      subject = 'Agendamento Rejeitado';
      messageBody = `Olá, ${appointment.client_name}. Infelizmente, seu horário para ${serviceName} com ${businessName} no dia ${date} às ${startTime} foi REJEITADO. Por favor, entre em contato para reagendar.`;
    } else {
      // Não notificar para outros status (completed, cancelled)
      return new Response(JSON.stringify({ message: `Status ${newStatus} updated, no notification sent.` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. SIMULAÇÃO DE ENVIO DE NOTIFICAÇÃO (WhatsApp/Email)
    console.log(`--- SIMULANDO ENVIO DE NOTIFICAÇÃO ---`);
    console.log(`Para: ${appointment.client_whatsapp} (ou ${appointment.client_email})`);
    console.log(`Assunto: ${subject}`);
    console.log(`Mensagem: ${messageBody}`);
    console.log(`--------------------------------------`);

    // Aqui você integraria a API real do WhatsApp ou Resend.
    // Por enquanto, apenas logamos o sucesso.

    return new Response(JSON.stringify({ message: 'Notification simulated successfully.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});