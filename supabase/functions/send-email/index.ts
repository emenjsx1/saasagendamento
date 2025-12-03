import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = 'agencodes@mozcodes.space'; 

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Validar chave da API do Resend
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY não configurada');
      return new Response(JSON.stringify({ 
        error: 'RESEND_API_KEY not configured. Please configure the Resend API key in Supabase Edge Function secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse do body
    let requestData;
    try {
      const bodyText = await req.text();
      if (!bodyText || bodyText.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'Request body is empty' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      requestData = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { to, subject, body } = requestData;

    // Validar campos obrigatórios
    if (!to || !subject || !body) {
      const missingFields = [];
      if (!to) missingFields.push('to');
      if (!subject) missingFields.push('subject');
      if (!body) missingFields.push('body');
      
      return new Response(JSON.stringify({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(JSON.stringify({ 
        error: `Invalid email format: ${to}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📧 Enviando email:', { to, subject, bodyLength: body.length });

    // Enviar email via Resend API
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
      let errorData;
      try {
        errorData = await resendResponse.json();
      } catch {
        errorData = { message: resendResponse.statusText };
      }
      
      console.error('❌ Resend API Error:', {
        status: resendResponse.status,
        statusText: resendResponse.statusText,
        error: errorData
      });
      
      return new Response(JSON.stringify({ 
        error: `Resend API failed: ${errorData.message || resendResponse.statusText}`,
        details: errorData
      }), {
        status: resendResponse.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resendResponse.json();
    console.log('✅ Email enviado com sucesso:', data);

    return new Response(JSON.stringify({ 
      message: 'Email sent successfully', 
      data 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Function Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});