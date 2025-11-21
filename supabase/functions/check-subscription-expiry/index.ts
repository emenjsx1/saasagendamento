import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = 'agencodes@mozcodes.space';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar todas as subscriptions ativas
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles!inner(email, first_name, last_name)
      `)
      .eq('status', 'active');

    if (subError) {
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No active subscriptions found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const emailsSent = [];

    for (const subscription of subscriptions) {
      if (!subscription.trial_ends_at) continue;

      const expirationDate = new Date(subscription.trial_ends_at);
      expirationDate.setHours(0, 0, 0, 0);

      const daysUntilExpiry = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Calcular data de expiração baseada no plan_name
      let calculatedExpirationDate: Date | null = null;
      const createdDate = new Date(subscription.created_at);
      
      if (subscription.plan_name?.includes('Semanal') || subscription.plan_name?.includes('Weekly')) {
        calculatedExpirationDate = new Date(createdDate);
        calculatedExpirationDate.setDate(createdDate.getDate() + 7);
      } else if (subscription.plan_name?.includes('Mensal') || subscription.plan_name?.includes('Monthly')) {
        calculatedExpirationDate = new Date(createdDate);
        calculatedExpirationDate.setDate(createdDate.getDate() + 30);
      } else if (subscription.plan_name?.includes('Anual') || subscription.plan_name?.includes('Annual')) {
        calculatedExpirationDate = new Date(createdDate);
        calculatedExpirationDate.setDate(createdDate.getDate() + 365);
      }

      // Usar trial_ends_at se disponível, senão usar data calculada
      const finalExpirationDate = subscription.trial_ends_at 
        ? new Date(subscription.trial_ends_at)
        : calculatedExpirationDate;

      if (!finalExpirationDate) continue;

      finalExpirationDate.setHours(0, 0, 0, 0);
      const finalDaysUntilExpiry = Math.floor((finalExpirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const profile = Array.isArray(subscription.profiles) ? subscription.profiles[0] : subscription.profiles;
      if (!profile || !profile.email) continue;

      let shouldSendEmail = false;
      let emailType = '';

      // Verificar se deve enviar email: 3 dias antes ou no dia da expiração
      if (finalDaysUntilExpiry === 3) {
        shouldSendEmail = true;
        emailType = 'reminder_3_days';
      } else if (finalDaysUntilExpiry === 0) {
        shouldSendEmail = true;
        emailType = 'expired';
      }

      if (!shouldSendEmail) continue;

      const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Cliente';
      const expirationDateFormatted = finalExpirationDate.toLocaleDateString('pt-MZ', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      let emailSubject = '';
      let emailBody = '';

      if (emailType === 'reminder_3_days') {
        emailSubject = '⏰ Lembrete: Sua assinatura expira em 3 dias';
        emailBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .warning-icon { font-size: 48px; margin-bottom: 20px; }
              .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="warning-icon">⏰</div>
                <h1>Lembrete de Renovação</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${userName}</strong>,</p>
                
                <p>Sua assinatura <strong>${subscription.plan_name}</strong> expirará em <strong>3 dias</strong>.</p>
                
                <div class="info-box">
                  <h3>Detalhes da Assinatura</h3>
                  <p><strong>Plano:</strong> ${subscription.plan_name}</p>
                  <p><strong>Data de Expiração:</strong> ${expirationDateFormatted}</p>
                </div>
                
                <p>Para continuar usando todos os recursos da plataforma, renove seu plano antes da data de expiração.</p>
                
                <div style="text-align: center;">
                  <a href="${Deno.env.get('APP_URL') || 'https://yourdomain.com'}/choose-plan" class="button">
                    Renovar Plano Agora
                  </a>
                </div>
                
                <div class="footer">
                  <p>FEITO POR AGENCODES</p>
                  <p>Se você tiver alguma dúvida, entre em contato conosco.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;
      } else if (emailType === 'expired') {
        emailSubject = '⚠️ Sua assinatura expirou - Renove agora';
        emailBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .warning-icon { font-size: 48px; margin-bottom: 20px; }
              .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="warning-icon">⚠️</div>
                <h1>Assinatura Expirada</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${userName}</strong>,</p>
                
                <p>Sua assinatura <strong>${subscription.plan_name}</strong> expirou em <strong>${expirationDateFormatted}</strong>.</p>
                
                <div class="info-box">
                  <h3>O que acontece agora?</h3>
                  <p>Para continuar usando todos os recursos da plataforma, você precisa renovar seu plano.</p>
                  <p>Acesse o painel de gestão para escolher um novo plano e renovar sua assinatura.</p>
                </div>
                
                <div style="text-align: center;">
                  <a href="${Deno.env.get('APP_URL') || 'https://yourdomain.com'}/choose-plan" class="button">
                    Renovar Plano Agora
                  </a>
                </div>
                
                <p style="margin-top: 20px;">Após a renovação, sua conta será reativada imediatamente.</p>
                
                <div class="footer">
                  <p>FEITO POR AGENCODES</p>
                  <p>Se você tiver alguma dúvida, entre em contato conosco.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;
      }

      if (emailSubject && emailBody && RESEND_API_KEY) {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: profile.email,
            subject: emailSubject,
            html: emailBody,
          }),
        });

        if (resendResponse.ok) {
          emailsSent.push({
            email: profile.email,
            type: emailType,
            subscription_id: subscription.id,
          });
        }
      }
    }

    return new Response(JSON.stringify({
      message: 'Subscription expiry check completed',
      emailsSent: emailsSent.length,
      details: emailsSent,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


