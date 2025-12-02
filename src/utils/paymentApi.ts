/**
 * Payment API Utilities
 * Handles communication with M-Pesa/e-Mola Tech payment gateway
 */

export interface PaymentRequest {
  amount: number;
  phone: string;
  method: 'mpesa' | 'emola';
  reference: string;
}

export interface PaymentResponse {
  success: boolean;
  message?: string;
  transaction_id?: string;
  reference?: string;
  status?: number;
  response?: any; // Resposta completa da API para debug
  details?: any; // Detalhes do erro se houver
}

/**
 * Validates phone number format (Mozambique: 84, 85, 86, 87)
 * Must be exactly 9 digits starting with 84, 85, 86, or 87
 */
export const validatePhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  // Regex: exactly 9 digits starting with 84, 85, 86, or 87
  return /^(84|85|86|87)\d{7}$/.test(digits);
};

/**
 * Processes payment via Supabase Edge Function (que chama a API do e-Mola/M-Pesa)
 * Isso evita problemas de CORS ao chamar a API diretamente do navegador
 */
export const processPaymentApi = async (request: PaymentRequest): Promise<PaymentResponse> => {
  try {
    // Validate phone number
    if (!validatePhoneNumber(request.phone)) {
      return {
        success: false,
        message: 'Número de telefone inválido. Use um número válido de Moçambique (84, 85, 86, 87).',
        status: 400,
      };
    }

    // Validar valor mínimo
    const amount = typeof request.amount === 'number' 
      ? request.amount 
      : parseFloat(String(request.amount));
    
    if (amount < 1 || isNaN(amount)) {
      return {
        success: false,
        message: 'Valor mínimo de pagamento é 1 MZN.',
        status: 400,
      };
    }

    // Limpar reference
    let cleanReference = request.reference
      .replace(/[^a-zA-Z0-9_]/g, '')
      .substring(0, 20);
    
    if (!cleanReference) {
      cleanReference = `AgenCode-${Date.now()}`;
    }

    // Limpar número de telefone
    let phoneDigits = request.phone.replace(/\D/g, '');
    if (phoneDigits.startsWith('258')) {
      phoneDigits = phoneDigits.substring(3);
    } else if (phoneDigits.startsWith('00258')) {
      phoneDigits = phoneDigits.substring(5);
    }

    // Chamar Edge Function do Supabase (evita problemas de CORS)
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Tentar obter sessão para autenticação
    let accessToken: string | null = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      accessToken = session?.access_token || null;
    } catch (e) {
      console.warn('Não foi possível obter sessão, continuando sem autenticação...');
    }

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ihozrsfnfmwmrkbzpqlj.supabase.co';
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/process-payment`;
    
    // Preparar headers (Supabase Edge Functions requerem apikey)
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlob3pyc2ZuZm13bXJrYnpwcWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDM0NDcsImV4cCI6MjA3ODUxOTQ0N30.k60F5T-nkbTDXdlWa85ogk_xTtAB35b9ZIsIvCnDgOE';
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'apikey': anonKey,
    };
    
    // Adicionar Authorization se tiver sessão (melhor para segurança)
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    console.log('📤 Chamando Edge Function de pagamento:', {
      url: edgeFunctionUrl,
      method: request.method,
      amount,
      phone: phoneDigits,
      reference: cleanReference,
    });

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: Number(amount),
        phone: phoneDigits,
        method: request.method,
        reference: cleanReference,
      }),
    });

    // Verificar se a resposta é JSON válido
    let responseData: any = {};
    try {
      const responseText = await response.text();
      console.log('📥 Resposta raw da Edge Function:', responseText);
      
      if (responseText) {
        responseData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('❌ Erro ao parsear resposta JSON:', parseError);
      return {
        success: false,
        message: 'Erro ao processar resposta do servidor. Tente novamente.',
        status: response.status || 500,
        details: { parseError: parseError.message },
      };
    }

    console.log('📥 Resposta da Edge Function:', {
      status: response.status,
      data: responseData,
    });

    // A Edge Function já retorna o formato correto
    if (response.ok && responseData.success) {
      return {
        success: true,
        transaction_id: responseData.transaction_id,
        reference: responseData.reference || cleanReference,
        response: responseData.response,
      };
    }

    // Erro retornado pela Edge Function - mostrar mensagem detalhada
    let errorMessage = responseData.message || 'Erro ao processar pagamento. Tente novamente.';
    
    // Se houver detalhes, incluir informações adicionais na mensagem
    if (responseData.details) {
      const details = responseData.details;
      
      // Adicionar informações específicas baseadas nos detalhes
      if (details.missingFields) {
        errorMessage = `Campos faltando: ${details.missingFields.join(', ')}. ${errorMessage}`;
      }
      
      if (details.receivedPhone && details.validFormat) {
        errorMessage = `${errorMessage}\n\nFormato esperado: ${details.validFormat}`;
      }
      
      if (details.length && details.expectedLength) {
        errorMessage = `${errorMessage}\n\nDígitos recebidos: ${details.length}, esperado: ${details.expectedLength}`;
      }
    }

    return {
      success: false,
      message: errorMessage,
      status: responseData.status || response.status,
      details: responseData.details,
    };

  } catch (error: any) {
    console.error('Payment API Error:', error);
    
    const isConnectionError = 
      error.message === 'Failed to fetch' || 
      error.message?.includes('timeout') ||
      error.message?.includes('network') ||
      error.type === 'network';
    
    if (isConnectionError) {
      return {
        success: false,
        message: 'Erro de conexão com o servidor. Verifique sua conexão com a internet e tente novamente.',
        status: 0,
        details: { error: 'Network error', connectionError: true },
      };
    }
    
    return {
      success: false,
      message: error.message || 'Erro ao processar pagamento. Tente novamente.',
      status: 0,
      details: error,
    };
  }
};

/**
 * Sends push notifications (optional)
 */
export const sendPushNotifications = async (userName: string, amount: number, method: string) => {
  const pushUrl1 = import.meta.env.VITE_PUSH_NOTIFICATION_URL_1;
  const pushUrl2 = import.meta.env.VITE_PUSH_NOTIFICATION_URL_2;

  const notificationData = {
    text: `${userName} pagou ${amount} MZN por ${method}`,
    title: 'Nova venda aprovada',
  };

  if (pushUrl1) {
    try {
      await fetch(pushUrl1, {
        method: 'POST',
        body: JSON.stringify(notificationData),
      });
    } catch (err) {
      console.error('Erro ao enviar notificação push 1:', err);
    }
  }

  if (pushUrl2) {
    try {
      await fetch(pushUrl2, {
        method: 'POST',
        body: JSON.stringify(notificationData),
      });
    } catch (err) {
      console.error('Erro ao enviar notificação push 2:', err);
    }
  }
};

/**
 * Sends UTM tracking event to Utmify API
 * Follows the exact format from the reference script
 */
export const sendToUtmify = async (
  status: 'waiting_payment' | 'paid',
  orderId: string,
  customer: { nome: string; email: string; phone: string },
  total: number,
  utmData: {
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_term: string | null;
    utm_content: string | null;
  }
): Promise<void> => {
  const utmifyApiToken = import.meta.env.VITE_UTMIFY_API_TOKEN;
  if (!utmifyApiToken) {
    console.log('Utmify API token não configurado, pulando rastreamento');
    return Promise.resolve();
  }

  try {
    const exchangeRate = 0.091; // 1 MZN ≈ 0.091 BRL
    const totalPriceInCentsBRL = Math.max(1, Math.round(total * exchangeRate * 100)); // nunca 0
    const gatewayFee = Math.max(1, Math.round(totalPriceInCentsBRL * 0.05)); // simulação 5%
    const userCommission = totalPriceInCentsBRL - gatewayFee;

    const now = new Date();
    const createdAt = now.toISOString().replace("T", " ").substring(0, 19);
    const approvedDate = status === "paid" ? createdAt : null;

    const payload = {
      orderId: String(orderId),
      platform: "AgenCode",
      paymentMethod: "mpesa_emola",
      status: status,
      createdAt: createdAt,
      approvedDate: approvedDate,
      refundedAt: null,
      customer: {
        name: customer.nome,
        email: customer.email,
        phone: customer.phone,
        document: null,
        country: "MZ",
        ip: "127.0.0.1" // Utmify recomenda enviar algo
      },
      products: [
        {
          id: "agen codes-subscription",
          name: "Assinatura AgenCode",
          planId: null,
          planName: null,
          quantity: 1,
          priceInCents: totalPriceInCentsBRL
        }
      ],
      trackingParameters: {
        src: null,
        sck: null,
        utm_source: utmData.utm_source || null,
        utm_campaign: utmData.utm_campaign || null,
        utm_medium: utmData.utm_medium || null,
        utm_content: utmData.utm_content || null,
        utm_term: utmData.utm_term || null
      },
      commission: {
        totalPriceInCents: totalPriceInCentsBRL,
        gatewayFeeInCents: gatewayFee,
        userCommissionInCents: userCommission,
        currency: "BRL"
      },
      isTest: false
    };

    const response = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: {
        "x-api-token": utmifyApiToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const res = await response.json();
    console.log(`📩 UTMIFY [${status}] =>`, res);
  } catch (err) {
    console.error("Erro ao enviar para Utmify:", err);
  }
};

