import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const body = await req.json();
    
    // Se recebeu um payload direto para enviar
    if (body.action === 'send_single' && body.payload) {
      const payload = body.payload;
      
      console.log('📤 [EDGE FUNCTION] Enviando webhook único para:', WEBHOOK_URL);
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
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar lembretes pendentes que devem ser enviados
    const { data: reminders, error: remindersError } = await supabase
      .rpc('get_pending_reminders_to_send');

    if (remindersError) {
      console.error('Erro ao buscar lembretes:', remindersError);
      return new Response(
        JSON.stringify({ success: false, error: remindersError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Nenhum lembrete pendente' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📬 Processando ${reminders.length} lembrete(s) pendente(s)`);

    let successCount = 0;
    let failCount = 0;

    // Processar cada lembrete
    for (const reminder of reminders) {
      try {
        // Preparar payload para n8n
        const payload = {
          reminder_id: reminder.id,
          business_id: reminder.business_id,
          client_id: reminder.client_id,
          appointment_id: reminder.appointment_id,
          client_name: reminder.client_name || 'Cliente',
          client_whatsapp: reminder.client_whatsapp || reminder.client_phone || null,
          client_phone: reminder.client_phone || null,
          client_email: null, // Buscar se necessário
          reminder_type: reminder.reminder_type || 'custom',
          title: reminder.title,
          message: reminder.message,
          send_via: reminder.send_via || 'whatsapp',
          scheduled_at: reminder.scheduled_at,
          metadata: reminder.metadata || {},
        };

        // Enviar para n8n
        const webhookResponse = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (webhookResponse.ok) {
          // Marcar como enviado
          await supabase
            .from('reminders')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', reminder.id);

          successCount++;
          console.log(`✅ Lembrete ${reminder.id} enviado com sucesso`);
        } else {
          // Marcar como falhou
          await supabase
            .from('reminders')
            .update({
              status: 'failed',
            })
            .eq('id', reminder.id);

          failCount++;
          console.error(`❌ Falha ao enviar lembrete ${reminder.id}:`, webhookResponse.status);
        }
      } catch (error: any) {
        console.error(`❌ Erro ao processar lembrete ${reminder.id}:`, error);
        
        // Marcar como falhou
        await supabase
          .from('reminders')
          .update({
            status: 'failed',
          })
          .eq('id', reminder.id);

        failCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: reminders.length,
        sent: successCount,
        failed: failCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao processar lembretes',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

