import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY'); // Assumindo que a chave Resend será configurada
// Usando o email fixo fornecido pelo usuário
const RESEND_FROM_EMAIL = 'agencodes@mozcodes.space'; 

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Autenticação (Opcional, mas recomendado para funções sensíveis)
  // Neste caso, vamos confiar que apenas o servidor Supabase ou o cliente autenticado
  // com a chave anon está chamando, mas para produção, a verificação JWT seria ideal.

  try {
    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY not configured.");
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: to,
        subject: subject,
        html: body,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('Resend API Error:', errorData);
      throw new Error(`Resend failed: ${resendResponse.statusText}`);
    }

    const data = await resendResponse.json();

    return new Response(JSON.stringify({ message: 'Email sent successfully', data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});