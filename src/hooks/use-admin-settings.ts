import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubscriptionConfig {
  trial_days: number;
  base_prices: Record<'weekly' | 'monthly' | 'annual', number>;
}

export interface PaymentGatewayConfig {
  mpesa_active: boolean;
  mpesa_fee_percent: number;
  emola_active: boolean;
  emola_fee_percent: number;
  card_active: boolean;
  card_fee_percent: number;
  // Note: API keys are typically stored securely as Supabase Secrets, not in this table.
}

export interface EmailTemplate {
  subject: string;
  body: string; // HTML content
}

export interface EmailTemplates {
  appointment_confirmed: EmailTemplate;
  appointment_pending: EmailTemplate;
  payment_reminder: EmailTemplate;
  trial_expiration: EmailTemplate;
}

export interface PlatformSettings {
  id: string;
  email_templates: EmailTemplates;
  payment_gateways: PaymentGatewayConfig;
  subscription_config: SubscriptionConfig;
}

export const defaultEmailTemplates: EmailTemplates = {
  appointment_confirmed: {
    subject: "{{status_emoji}} Agendamento {{status_text}}: {{service_name}}",
    body: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Agendamento Confirmado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 0;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08); overflow: hidden; max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, {{business_primary_color}}08 0%, {{business_primary_color}}03 100%); padding: 50px 40px 40px 40px; text-align: center;">
              <img src="{{business_logo_url}}" alt="{{business_name}}" style="max-width: 200px; max-height: 70px; height: auto; margin-bottom: 24px; display: block; margin-left: auto; margin-right: auto;" onerror="this.style.display='none';" />
              <div style="font-size: 56px; font-weight: bold; color: {{business_primary_color}}; margin-bottom: 16px; line-height: 1;">{{status_emoji}}</div>
              <h1 style="margin: 0; color: {{business_primary_color}}; font-size: 32px; font-weight: 700; letter-spacing: -0.8px; line-height: 1.2;">
                Seu agendamento foi confirmado!
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 48px 40px;">
              <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 19px; line-height: 1.6; font-weight: 500;">
                Olá, <strong style="color: #111827; font-weight: 700;">{{client_name}}</strong>!
              </p>
              <p style="margin: 0 0 36px 0; color: #6b7280; font-size: 17px; line-height: 1.7;">
                Seu agendamento foi confirmado com sucesso! Aqui estão os detalhes:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%); border: 2px solid {{business_primary_color}}15; border-left: 6px solid {{business_primary_color}}; border-radius: 16px; margin: 0 0 32px 0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td style="padding: 32px;">
                    <h2 style="margin: 0 0 28px 0; color: #111827; font-size: 22px; font-weight: 700; border-bottom: 2px solid {{business_primary_color}}20; padding-bottom: 16px;">
                      Detalhes do seu agendamento
                    </h2>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      <tr>
                        <td style="padding: 14px 0; color: #6b7280; font-size: 15px; width: 150px; vertical-align: top; font-weight: 500;"><strong>Serviço:</strong></td>
                        <td style="padding: 14px 0; color: #111827; font-size: 15px; font-weight: 600; vertical-align: top;">{{service_name}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>Data:</strong></td>
                        <td style="padding: 14px 0; color: #111827; font-size: 15px; font-weight: 600; vertical-align: top;">{{formatted_date}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>Hora:</strong></td>
                        <td style="padding: 14px 0; color: #111827; font-size: 15px; font-weight: 600; vertical-align: top;">{{formatted_time}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>Duração:</strong></td>
                        <td style="padding: 14px 0; color: #111827; font-size: 15px; font-weight: 600; vertical-align: top;">{{service_duration}} min</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>Valor:</strong></td>
                        <td style="padding: 14px 0; color: {{business_primary_color}}; font-size: 20px; font-weight: 700; vertical-align: top;">{{service_price}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>Código do cliente:</strong></td>
                        <td style="padding: 14px 0; vertical-align: top;">
                          <span style="display: inline-block; background-color: #f3f4f6; color: #111827; font-family: 'Courier New', monospace; font-size: 15px; font-weight: 600; padding: 10px 20px; border-radius: 8px; border: 1px solid #e5e7eb; letter-spacing: 1.5px;">{{client_code}}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 16px; padding: 28px; margin: 0 0 32px 0; border: 1px solid #e5e7eb;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 20px 0; color: #111827; font-size: 19px; font-weight: 600;">Informações do negócio</h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0; color: #6b7280; font-size: 15px; width: 110px; vertical-align: top; font-weight: 500;"><strong>Nome:</strong></td>
                        <td style="padding: 10px 0; color: #111827; font-size: 15px; font-weight: 600; vertical-align: top;">{{business_name}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>WhatsApp:</strong></td>
                        <td style="padding: 10px 0; color: #111827; font-size: 15px; vertical-align: top;">{{business_whatsapp}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>Endereço:</strong></td>
                        <td style="padding: 10px 0; color: #111827; font-size: 15px; vertical-align: top;">{{business_address}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px 0;">
                    <a href="{{appointment_link}}" style="display: inline-block; background: linear-gradient(135deg, {{business_primary_color}} 0%, {{business_primary_color}}e6 100%); color: #ffffff; padding: 18px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 17px; box-shadow: 0 6px 20px {{business_primary_color}}40; letter-spacing: 0.3px;">
                      Ver detalhes do agendamento
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.7; text-align: center;">
                Estamos ansiosos para atendê-lo! Caso precise reagendar ou cancelar, entre em contato conosco através do WhatsApp.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 36px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; font-weight: 600; letter-spacing: 0.8px;">FEITO POR AgenCode</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">Este é um email automático, por favor não responda.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  appointment_pending: {
    subject: "{{status_emoji}} Agendamento {{status_text}}: {{service_name}}",
    body: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Agendamento Criado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 0;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08); overflow: hidden; max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, {{business_primary_color}}08 0%, {{business_primary_color}}03 100%); padding: 50px 40px 40px 40px; text-align: center;">
              <img src="{{business_logo_url}}" alt="{{business_name}}" style="max-width: 200px; max-height: 70px; height: auto; margin-bottom: 24px; display: block; margin-left: auto; margin-right: auto;" onerror="this.style.display='none';" />
              <div style="font-size: 56px; font-weight: bold; color: {{business_primary_color}}; margin-bottom: 16px; line-height: 1;">{{status_emoji}}</div>
              <h1 style="margin: 0; color: {{business_primary_color}}; font-size: 32px; font-weight: 700; letter-spacing: -0.8px; line-height: 1.2;">
                Agendamento criado com sucesso
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 48px 40px;">
              <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 19px; line-height: 1.6; font-weight: 500;">
                Olá, <strong style="color: #111827; font-weight: 700;">{{client_name}}</strong>!
              </p>
              <p style="margin: 0 0 36px 0; color: #6b7280; font-size: 17px; line-height: 1.7;">
                Aqui estão os detalhes do seu agendamento:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%); border: 2px solid {{business_primary_color}}15; border-left: 6px solid {{business_primary_color}}; border-radius: 16px; margin: 0 0 32px 0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td style="padding: 32px;">
                    <h2 style="margin: 0 0 28px 0; color: #111827; font-size: 22px; font-weight: 700; border-bottom: 2px solid {{business_primary_color}}20; padding-bottom: 16px;">
                      Detalhes do seu agendamento
                    </h2>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      <tr>
                        <td style="padding: 14px 0; color: #6b7280; font-size: 15px; width: 150px; vertical-align: top; font-weight: 500;"><strong>Serviço:</strong></td>
                        <td style="padding: 14px 0; color: #111827; font-size: 15px; font-weight: 600; vertical-align: top;">{{service_name}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>Data:</strong></td>
                        <td style="padding: 14px 0; color: #111827; font-size: 15px; font-weight: 600; vertical-align: top;">{{formatted_date}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>Hora:</strong></td>
                        <td style="padding: 14px 0; color: #111827; font-size: 15px; font-weight: 600; vertical-align: top;">{{formatted_time}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>Duração:</strong></td>
                        <td style="padding: 14px 0; color: #111827; font-size: 15px; font-weight: 600; vertical-align: top;">{{service_duration}} min</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>Valor:</strong></td>
                        <td style="padding: 14px 0; color: {{business_primary_color}}; font-size: 20px; font-weight: 700; vertical-align: top;">{{service_price}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>Código do cliente:</strong></td>
                        <td style="padding: 14px 0; vertical-align: top;">
                          <span style="display: inline-block; background-color: #f3f4f6; color: #111827; font-family: 'Courier New', monospace; font-size: 15px; font-weight: 600; padding: 10px 20px; border-radius: 8px; border: 1px solid #e5e7eb; letter-spacing: 1.5px;">{{client_code}}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 16px; padding: 28px; margin: 0 0 32px 0; border: 1px solid #e5e7eb;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 20px 0; color: #111827; font-size: 19px; font-weight: 600;">Informações do negócio</h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0; color: #6b7280; font-size: 15px; width: 110px; vertical-align: top; font-weight: 500;"><strong>Nome:</strong></td>
                        <td style="padding: 10px 0; color: #111827; font-size: 15px; font-weight: 600; vertical-align: top;">{{business_name}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>WhatsApp:</strong></td>
                        <td style="padding: 10px 0; color: #111827; font-size: 15px; vertical-align: top;">{{business_whatsapp}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #6b7280; font-size: 15px; vertical-align: top; font-weight: 500;"><strong>Endereço:</strong></td>
                        <td style="padding: 10px 0; color: #111827; font-size: 15px; vertical-align: top;">{{business_address}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px 0;">
                    <a href="{{appointment_link}}" style="display: inline-block; background: linear-gradient(135deg, {{business_primary_color}} 0%, {{business_primary_color}}e6 100%); color: #ffffff; padding: 18px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 17px; box-shadow: 0 6px 20px {{business_primary_color}}40; letter-spacing: 0.3px;">
                      Ver detalhes do agendamento
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.7; text-align: center;">
                Estamos ansiosos para atendê-lo! Caso precise reagendar ou cancelar, entre em contato conosco através do WhatsApp.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 36px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; font-weight: 600; letter-spacing: 0.8px;">FEITO POR AgenCode</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">Este é um email automático, por favor não responda.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  payment_reminder: {
    subject: "💳 Lembrete de Pagamento: Sua Assinatura",
    body: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Lembrete de Pagamento</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 0;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08); overflow: hidden; max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, {{business_primary_color}} 0%, {{business_primary_color}}d9 100%); padding: 50px 40px; text-align: center;">
              <img src="{{business_logo_url}}" alt="{{business_name}}" style="max-width: 200px; max-height: 70px; height: auto; margin-bottom: 24px; display: block; margin-left: auto; margin-right: auto;" onerror="this.style.display='none';" />
              <div style="font-size: 56px; font-weight: bold; color: #ffffff; margin-bottom: 16px; line-height: 1;">💳</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.8px; line-height: 1.2;">
                Pagamento Pendente
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 48px 40px;">
              <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 19px; line-height: 1.6; font-weight: 500;">
                Olá,
              </p>
              <p style="margin: 0 0 36px 0; color: #6b7280; font-size: 17px; line-height: 1.7;">
                Identificamos que seu plano <strong style="color: #111827; font-weight: 600;">{{plan_name}}</strong> está com pagamento pendente.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, {{business_primary_color}}08 0%, {{business_primary_color}}03 100%); border: 3px solid {{business_primary_color}}30; border-radius: 16px; margin: 0 0 36px 0; box-shadow: 0 4px 16px {{business_primary_color}}20;">
                <tr>
                  <td style="padding: 36px; text-align: center;">
                    <p style="margin: 0 0 12px 0; color: {{business_primary_color}}; font-size: 14px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;">VALOR A PAGAR</p>
                    <p style="margin: 0; color: {{business_primary_color}}; font-size: 42px; font-weight: 700; line-height: 1.2;">{{price}}</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 36px 0; color: #374151; font-size: 17px; line-height: 1.7;">
                Para continuar usando todos os recursos da plataforma, por favor, complete o pagamento da sua assinatura.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="{{payment_link}}" style="display: inline-block; background: linear-gradient(135deg, {{business_primary_color}} 0%, {{business_primary_color}}e6 100%); color: #ffffff; padding: 18px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 17px; box-shadow: 0 6px 20px {{business_primary_color}}40; letter-spacing: 0.3px;">
                      Completar Pagamento
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 36px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; font-weight: 600; letter-spacing: 0.8px;">FEITO POR AgenCode</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">Se você já realizou o pagamento, ignore este email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  trial_expiration: {
    subject: "⏰ Seu Teste Gratuito Expira em Breve!",
    body: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Aviso de Expiração de Trial</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 0;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08); overflow: hidden; max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, {{business_primary_color}} 0%, {{business_primary_color}}d9 100%); padding: 50px 40px; text-align: center;">
              <img src="{{business_logo_url}}" alt="{{business_name}}" style="max-width: 200px; max-height: 70px; height: auto; margin-bottom: 24px; display: block; margin-left: auto; margin-right: auto;" onerror="this.style.display='none';" />
              <div style="font-size: 56px; font-weight: bold; color: #ffffff; margin-bottom: 16px; line-height: 1;">⏰</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.8px; line-height: 1.2;">
                Aviso Importante
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 48px 40px;">
              <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 19px; line-height: 1.6; font-weight: 500;">
                Olá,
              </p>
              <p style="margin: 0 0 36px 0; color: #6b7280; font-size: 17px; line-height: 1.7;">
                Seu período de <strong style="color: {{business_primary_color}}; font-weight: 600;">teste gratuito</strong> está expirando em breve!
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, {{business_primary_color}}08 0%, {{business_primary_color}}03 100%); border: 3px solid {{business_primary_color}}30; border-radius: 16px; margin: 0 0 36px 0; box-shadow: 0 4px 16px {{business_primary_color}}20;">
                <tr>
                  <td style="padding: 36px; text-align: center;">
                    <p style="margin: 0 0 12px 0; color: {{business_primary_color}}; font-size: 14px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;">DIAS RESTANTES</p>
                    <p style="margin: 0; color: {{business_primary_color}}; font-size: 56px; font-weight: 700; line-height: 1.2;">{{days_left}}</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 36px 0; color: #374151; font-size: 17px; line-height: 1.7;">
                Não perca o acesso! Escolha um plano pago agora e continue aproveitando todos os recursos da plataforma.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="{{upgrade_link}}" style="display: inline-block; background: linear-gradient(135deg, {{business_primary_color}} 0%, {{business_primary_color}}e6 100%); color: #ffffff; padding: 18px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 17px; box-shadow: 0 6px 20px {{business_primary_color}}40; letter-spacing: 0.3px;">
                      Escolher Plano
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 36px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; font-weight: 600; letter-spacing: 0.8px;">FEITO POR AgenCode</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">Este é um email automático, por favor não responda.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
};

const defaultPaymentGateways: PaymentGatewayConfig = {
  mpesa_active: true,
  mpesa_fee_percent: 2.5,
  emola_active: true,
  emola_fee_percent: 3.0,
  card_active: false,
  card_fee_percent: 5.0,
};

const defaultSubscriptionConfig: SubscriptionConfig = {
  trial_days: 3,
  base_prices: { weekly: 147, monthly: 588, annual: 7644 },
};


export const useAdminSettings = () => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    
    // Tenta buscar a única linha de configurações
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
      toast.error("Erro ao carregar configurações da plataforma.");
      console.error(error);
      setSettings(null);
    } else if (data) {
      setSettings(data as PlatformSettings);
    } else {
      // Se não houver linha, insere a linha padrão
      const initialSettings = {
        email_templates: defaultEmailTemplates,
        payment_gateways: defaultPaymentGateways,
        subscription_config: defaultSubscriptionConfig,
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('platform_settings')
        .insert(initialSettings)
        .select('*')
        .single();
        
      if (insertError) {
        console.error("Failed to insert default settings:", insertError);
        toast.error("Falha ao inicializar configurações padrão.");
      } else {
        setSettings(insertData as PlatformSettings);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<PlatformSettings>) => {
    if (!settings) return;
    
    const loadingToastId = toast.loading("Salvando configurações...");
    
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update(newSettings)
        .eq('id', settings.id);

      if (error) throw error;
      
      // Atualiza o estado local
      setSettings(prev => ({ ...prev!, ...newSettings }));
      toast.success("Configurações salvas com sucesso!", { id: loadingToastId });
      return true;
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message, { id: loadingToastId });
      console.error(error);
      return false;
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    refresh: fetchSettings,
  };
};