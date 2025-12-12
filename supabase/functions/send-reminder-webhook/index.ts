import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const WEBHOOK_URL = 'https://n8n.ejss.space/webhook-test/lembrete';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    console.log('📤 [EDGE FUNCTION] Enviando webhook para:', WEBHOOK_URL);
    console.log('📦 [EDGE FUNCTION] Payload:', JSON.stringify(payload, null, 2));

    // Enviar para n8n
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('📥 [EDGE FUNCTION] Resposta recebida:', webhookResponse.status, webhookResponse.statusText);

    if (webhookResponse.ok) {
      const responseText = await webhookResponse.text();
      console.log('✅ [EDGE FUNCTION] Webhook enviado com sucesso');
      console.log('📄 [EDGE FUNCTION] Resposta:', responseText);

      return new Response(
        JSON.stringify({ success: true, message: 'Webhook enviado com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const errorText = await webhookResponse.text();
      console.error('❌ [EDGE FUNCTION] Erro ao enviar webhook:', webhookResponse.status, errorText);

      return new Response(
        JSON.stringify({ success: false, error: errorText }),
        { status: webhookResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('❌ [EDGE FUNCTION] Erro na função:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao processar webhook',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


