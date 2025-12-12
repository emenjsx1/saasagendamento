/**
 * Dodo Payments Webhook Handler
 * Processa webhooks do Dodo Payments para atualizar subscriptions e payments
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dodo-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DodoWebhookEvent {
  type: string; // "payment.succeeded", "payment.failed", etc.
  business_id?: string;
  data: {
    payment_id: string;
    status: string; // "succeeded", "failed", etc.
    total_amount: number;
    currency: string;
    customer?: {
      email?: string;
      name?: string;
    };
    metadata?: {
      user_id?: string;
      plan_name?: string;
      billing_period?: number;
      business_id?: string;
      reference?: string;
      // Campos para pagamento de agendamento
      service_id?: string;
      service_name?: string;
      appointment_date?: string;
      appointment_time?: string;
      client_name?: string;
      client_email?: string;
      client_whatsapp?: string;
      payment_type?: 'subscription' | 'appointment'; // Tipo de pagamento
    };
    created_at: string;
    updated_at?: string;
  };
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Verificar assinatura do webhook (opcional, mas recomendado)
    const signature = req.headers.get('x-dodo-signature');
    const webhookSecret = Deno.env.get('DODO_WEBHOOK_SECRET');
    
    // TODO: Implementar verificação de assinatura se necessário
    // if (webhookSecret && signature) {
    //   const isValid = verifySignature(req.body, signature, webhookSecret);
    //   if (!isValid) {
    //     return new Response(
    //       JSON.stringify({ error: 'Invalid signature' }),
    //       { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //     );
    //   }
    // }

    const webhookData: DodoWebhookEvent = await req.json();
    const { type, data } = webhookData;

    console.log('📥 Dodo Payments Webhook recebido:', { type, paymentId: data.payment_id, status: data.status });

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://ihozrsfnfmwmrkbzpqlj.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Processar apenas eventos de pagamento bem-sucedido
    // Dodo Payments usa: type: "payment.succeeded" e status: "succeeded"
    if (type === 'payment.succeeded' && data.status === 'succeeded') {
      const metadata = data.metadata || {};
      const paymentId = data.payment_id;
      const amount = data.total_amount / 100; // Dodo Payments envia em centavos
      const currency = data.currency;
      const customerEmail = data.customer?.email || metadata.client_email || '';
      const customerName = data.customer?.name || metadata.client_name || '';
      const paidAt = data.updated_at || data.created_at;
      const paymentType = metadata.payment_type || 'subscription'; // 'subscription' ou 'appointment'

      // ============================================
      // PROCESSAR PAGAMENTO DE AGENDAMENTO
      // ============================================
      if (paymentType === 'appointment' && metadata.service_id && metadata.appointment_date && metadata.appointment_time) {
        console.log('📅 Processando pagamento de agendamento:', {
          service_id: metadata.service_id,
          appointment_date: metadata.appointment_date,
          appointment_time: metadata.appointment_time,
          client_name: metadata.client_name,
        });

        // Buscar informações do serviço para obter business_id e duração
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('id, name, duration_minutes, price, business_id')
          .eq('id', metadata.service_id)
          .single();

        if (serviceError || !serviceData) {
          console.error('❌ Erro ao buscar serviço:', serviceError);
          return new Response(
            JSON.stringify({ error: 'Service not found', service_id: metadata.service_id }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar business_id do metadata ou do serviço
        let businessId = metadata.business_id || serviceData.business_id;
        if (!businessId) {
          console.error('❌ business_id não encontrado no metadata nem no serviço');
          return new Response(
            JSON.stringify({ error: 'Business ID not found in metadata or service' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar informações do negócio para verificar auto_assign_employees
        const { data: businessData } = await supabase
          .from('businesses')
          .select('id, auto_assign_employees')
          .eq('id', businessId)
          .single();

        const autoAssignEnabled = businessData?.auto_assign_employees || false;

        // Calcular start_time e end_time
        const appointmentDate = new Date(metadata.appointment_date);
        const [hours, minutes] = metadata.appointment_time.split(':').map(Number);
        appointmentDate.setHours(hours, minutes, 0, 0);
        
        const startTime = appointmentDate.toISOString();
        const endTime = new Date(appointmentDate.getTime() + serviceData.duration_minutes * 60000).toISOString();

        // Gerar código único do cliente
        const clientCode = `CLI-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Determinar employee_id (atribuição automática se habilitada)
        let employeeId: string | null = null;
        
        if (autoAssignEnabled) {
          // Buscar funcionários ativos do negócio
          const { data: employees } = await supabase
            .from('employees')
            .select('id')
            .eq('business_id', businessId)
            .eq('is_active', true);

          if (employees && employees.length > 0) {
            // Buscar agendamentos confirmados no mesmo horário
            const { data: existingAppointments } = await supabase
              .from('appointments')
              .select('employee_id')
              .eq('business_id', businessId)
              .eq('status', 'confirmed')
              .eq('start_time', startTime);

            const busyEmployeeIds = new Set(
              (existingAppointments || []).map((apt: any) => apt.employee_id).filter(Boolean)
            );

            // Encontrar primeiro funcionário disponível
            const availableEmployee = employees.find((emp: any) => !busyEmployeeIds.has(emp.id));
            if (availableEmployee) {
              employeeId = availableEmployee.id;
              console.log('✅ Funcionário atribuído automaticamente:', employeeId);
            } else {
              // Se todos estão ocupados, atribuir o primeiro disponível (pode ter sobreposição)
              employeeId = employees[0].id;
              console.log('⚠️ Todos funcionários ocupados, atribuindo primeiro disponível:', employeeId);
            }
          }
        }

        // Buscar user_id se cliente tiver email
        let userId: string | null = null;
        if (customerEmail) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', customerEmail)
            .maybeSingle();
          
          if (profileData) {
            userId = profileData.id;
          }
        }

        // Criar agendamento com status 'confirmed' (já foi pago)
        const { data: createdAppointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            business_id: businessId,
            service_id: metadata.service_id,
            client_name: metadata.client_name || customerName,
            client_whatsapp: metadata.client_whatsapp || null,
            client_email: customerEmail || null,
            start_time: startTime,
            end_time: endTime,
            status: 'confirmed', // Confirmado automaticamente após pagamento
            client_code: clientCode,
            user_id: userId,
            employee_id: employeeId,
          })
          .select('id')
          .single();

        if (appointmentError) {
          console.error('❌ Erro ao criar agendamento:', appointmentError);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to create appointment', 
              details: appointmentError.message 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('✅ Agendamento criado com sucesso:', createdAppointment?.id);

        // Registrar pagamento na tabela payments
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: userId,
            amount: amount,
            status: 'confirmed',
            payment_type: 'appointment',
            method: 'card',
            transaction_id: paymentId,
            notes: `Pagamento do agendamento ${metadata.service_name || serviceData.name} - ${new Date(startTime).toLocaleDateString('pt-BR')} às ${metadata.appointment_time} via Dodo Payments`,
            payment_date: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
          });

        if (paymentError) {
          console.warn('⚠️ Erro ao registrar pagamento (não crítico):', paymentError);
        } else {
          console.log('✅ Pagamento registrado');
        }

        // Adicionar ao saldo do negócio (com taxa de 8% descontada)
        try {
          const { error: balanceError } = await supabase.rpc('add_to_business_balance', {
            p_business_id: businessId,
            p_amount: amount,
            p_currency: currency.toUpperCase(),
          });

          if (balanceError) {
            console.warn('⚠️ Erro ao adicionar ao saldo do negócio (não crítico):', balanceError);
          } else {
            console.log('✅ Saldo do negócio atualizado');
          }
        } catch (balanceErr) {
          console.warn('⚠️ Função add_to_business_balance não disponível ou erro:', balanceErr);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Appointment created successfully',
            appointment_id: createdAppointment?.id,
            payment_id: paymentId,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // PROCESSAR PAGAMENTO DE ASSINATURA (comportamento original)
      // ============================================
      // Tentar obter user_id do metadata ou buscar por email
      let userId = metadata.user_id;
      
      if (!userId && customerEmail) {
        // Buscar usuário por email
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', customerEmail)
          .single();
        
        if (profileData) {
          userId = profileData.id;
        }
      }

      if (!userId) {
        console.error('❌ user_id não encontrado no metadata e não foi possível buscar por email');
        return new Response(
          JSON.stringify({ error: 'Missing user_id in metadata and could not find user by email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const planName = metadata.plan_name || 'Plano Básico';
      const billingPeriod = metadata.billing_period || 1;
      const businessId = metadata.business_id || webhookData.business_id;

      console.log('💳 Processando pagamento:', {
        userId,
        planName,
        billingPeriod,
        amount,
        currency,
        paymentId,
      });

      // 1. Verificar se já existe subscription ativa para este usuário
      const { data: existingSub, error: subCheckError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // 2. Calcular data de expiração
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + billingPeriod);

      // 3. Criar ou atualizar subscription
      if (existingSub) {
        // Atualizar subscription existente
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan_name: planName,
            price: amount,
            trial_ends_at: expiresAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', existingSub.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar subscription:', updateError);
          throw updateError;
        }

        console.log('✅ Subscription atualizada:', existingSub.id);
      } else {
        // Criar nova subscription
        const { data: newSub, error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_name: planName,
            price: amount,
            is_trial: false,
            status: 'active',
            created_at: now.toISOString(),
            trial_ends_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Erro ao criar subscription:', insertError);
          throw insertError;
        }

        console.log('✅ Subscription criada:', newSub?.id);
      }

      // 4. Verificar se já existe payment com este transaction_id
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('transaction_id', paymentId)
        .single();

      if (!existingPayment) {
        // 5. Registrar pagamento
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: userId,
            amount: amount,
            status: 'confirmed',
            payment_type: 'subscription',
            method: 'card',
            transaction_id: paymentId,
            notes: `Pagamento da assinatura ${planName} - ${billingPeriod} ${billingPeriod === 1 ? 'mês' : 'meses'} via Dodo Payments (${currency})`,
            payment_date: paidAt ? new Date(paidAt).toISOString() : now.toISOString(),
          });

        if (paymentError) {
          console.error('❌ Erro ao registrar pagamento:', paymentError);
          throw paymentError;
        }

        console.log('✅ Pagamento registrado:', paymentId);
      } else {
        console.log('ℹ️ Pagamento já existe, pulando inserção');
      }

      // 6. Garantir que conta seja BUSINESS
      if (businessId) {
        const { error: businessError } = await supabase
          .from('businesses')
          .update({ updated_at: now.toISOString() })
          .eq('id', businessId);

        if (businessError) {
          console.warn('⚠️ Erro ao atualizar business:', businessError);
        }
      }

      // 7. Atualizar tabela consolidada (se a função existir)
      try {
        const { error: refreshError } = await supabase.rpc('refresh_user_consolidated', {
          p_user_id: userId,
        });

        if (refreshError) {
          console.warn('⚠️ Erro ao atualizar tabela consolidada:', refreshError);
        }
      } catch (e) {
        console.warn('⚠️ Função refresh_user_consolidated não disponível');
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook processado com sucesso',
          paymentId: paymentId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Eventos não processados (payment.failed, payment.refunded, etc.)
    if (type === 'payment.failed' || data.status === 'failed') {
      console.log('❌ Pagamento falhou:', data.payment_id);
      // Opcional: registrar falha no banco de dados
    }

    if (type === 'payment.refunded' || data.status === 'refunded') {
      console.log('↩️ Pagamento reembolsado:', data.payment_id);
      // Opcional: atualizar status do pagamento e subscription
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook recebido mas não processado',
        type,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao processar webhook',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

