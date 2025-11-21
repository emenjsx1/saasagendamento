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
 * Processes payment via M-Pesa/e-Mola Tech API
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

    // Get credentials - usar valores padrão se não estiverem nas env vars
    // Token atualizado: expira em 2026
    const defaultToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5ZjkwMzg2Mi1hNzgwLTQ0MGQtOGVkNS1iOGQ4MDkwYjE4MGUiLCJqdGkiOiIzMjI0ZTdiZWJmOTY3MDc4OWE4MWUyZWUwMDg2ZTY2MmM4NTYxYjlkY2UxNzVjZGQzNTk2ODBjYTU2NTU0OGNlY2Q2YTIxZjJiMWJjMTQ0YiIsImlhdCI6MTc1NTYwNzI2Ni41MjcyNzgsIm5iZiI6MTc1NTYwNzI2Ni41MjcyODEsImV4cCI6MTc4NzE0MzI2Ni41MjM2Nywic3ViIjoiIiwic2NvcGVzIjpbXX0.NEJzqLOaMnaI4iq3OMhhXAYLHDFY_JAq45JiQVfrJDoXQVcrVR0hD0tGslRUfyn-UA6gst5CXDBbeJc4l7C8FDxJYKQffbl_w12AwLQMj0wOoV9zp_dLSsgjwbwwyoyOWaP0WXMfLZOglZI2uW1tlN00uk17gZzLjtyE2M5TWPdwsaFyMkb6PpquQNB7hAnoOYWLYza66ME7F7rP7uv0qJ1w-PIj6MsjHy8ar5Dm67ISicu0sSi1WS_8XIxVAOX1zlHUQweQTvlOQILN9W1tc2-F0mRMPxAoNwOLd641puUikL33-f5Dt0hPFceKXIM6E4hCqQX4Vgq1KMYtFNdCahqFqbjupTbQPESCXEK1coGtS76p7ArsyOZALreo18xZqvJ0wQF4XYl0qab7rvbFmypDQU19R3bEsW4rAH84g9WspdF86TNZeqefqQ3JqGgqis7FekC-wdWhS3qnM5CElzLmGNpnyqHJ7lHMDuup9ejWHjNtG64E2QqCnj6UA_ACCo14LFdReT2RAySXi58Mvv8bb47XpT1xPNFBzRGQq6u9WZCHFyO07tCPmBBeinS4oElkG1upXRvE8pO7U3plzmkBOTByMDmSnBXcFDOadwym8LYfk7SYqWSSN9-0k0kFdt8gsQpAmtKCrs_hbfihhccfbHhf4HHis23W7-kTCUs';
    
    const accessToken = request.method === 'mpesa'
      ? (import.meta.env.VITE_MPESA_ACCESS_TOKEN || defaultToken)
      : (import.meta.env.VITE_EMOLA_ACCESS_TOKEN || defaultToken);

    const clientId = import.meta.env.VITE_MPESA_CLIENT_ID || '9f903862-a780-440d-8ed5-b8d8090b180e';

    const walletId = request.method === 'mpesa'
      ? (import.meta.env.VITE_MPESA_WALLET_ID || '993607')
      : (import.meta.env.VITE_EMOLA_WALLET_ID || '993606');

    // Log para debug (remover em produção)
    console.log('Credenciais de pagamento:', {
      method: request.method,
      hasAccessToken: !!accessToken,
      hasWalletId: !!walletId,
      walletId,
      clientId,
    });

    // Clean phone number - formato correto: 9 dígitos SEM código do país
    // Exemplo: 84XXXXXXX ou 85XXXXXXX (sem +258, sem 00258)
    let phoneDigits = request.phone.replace(/\D/g, '');
    
    // Remover código do país se presente (258 ou 00258)
    if (phoneDigits.startsWith('258')) {
      phoneDigits = phoneDigits.substring(3);
    } else if (phoneDigits.startsWith('00258')) {
      phoneDigits = phoneDigits.substring(5);
    }
    
    // Garantir que tem exatamente 9 dígitos
    if (phoneDigits.length !== 9) {
      return {
        success: false,
        message: 'Número de telefone deve ter 9 dígitos (ex: 84XXXXXXX).',
        status: 400,
      };
    }

    // Call payment API
    const apiUrl = `https://mpesaemolatech.com/v1/c2b/${request.method}-payment/${walletId}`;

    // Garantir que amount é um NÚMERO (não string)
    const amount = typeof request.amount === 'number' 
      ? request.amount 
      : parseFloat(request.amount.toString());
    
    // Validar valor mínimo
    if (amount < 1 || isNaN(amount)) {
      return {
        success: false,
        message: 'Valor mínimo de pagamento é 1 MZN.',
        status: 400,
      };
    }
    
    // Limpar reference - sem espaços, sem caracteres especiais, máximo 20 caracteres
    let cleanReference = request.reference
      .replace(/[^a-zA-Z0-9_]/g, '') // Remove caracteres especiais
      .substring(0, 20); // Máximo 20 caracteres
    
    if (!cleanReference) {
      cleanReference = `order_${Date.now()}`;
    }
    
    // Payload no formato exato que a API espera
    const requestBody = {
      client_id: clientId,
      amount: Number(amount), // Garantir que é número
      phone: phoneDigits, // 9 dígitos sem código do país
      reference: cleanReference, // Limpo e sem espaços
    };

    console.log('📤 Enviando requisição de pagamento:', {
      url: apiUrl,
      method: 'POST',
      payload: requestBody,
      payloadStringified: JSON.stringify(requestBody),
      payloadType: {
        amount: typeof requestBody.amount,
        phone: typeof requestBody.phone,
        phoneLength: requestBody.phone.length,
        reference: typeof requestBody.reference,
        referenceLength: requestBody.reference.length,
      },
      hasAccessToken: !!accessToken,
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    let responseData: any = {};
    const responseText = await response.text();
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao parsear resposta JSON:', responseText);
      responseData = { message: responseText || 'Resposta inválida da API' };
    }

    console.log('📥 Resposta da API de pagamento:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      mpesa_server_response: responseData.mpesa_server_response,
      error: responseData.error,
      message: responseData.message,
      details: responseData.details || responseData,
    });
    
    // Log completo dos details para debug do erro 422
    if (response.status === 422) {
      console.error('❌ ERRO 422 - Detalhes completos:', {
        fullResponse: responseData,
        errors: responseData.errors,
        validation: responseData.validation,
        mpesa_response: responseData.mpesa_server_response,
      });
    }

    // Tratar sucesso (200 ou 201)
    if (response.status === 200 || response.status === 201) {
      console.log('✅ Pagamento aprovado pela API!', responseData);
      return {
        success: true,
        transaction_id: responseData.transaction_id 
          || responseData.reference 
          || responseData.id
          || responseData.transactionId
          || responseData.order_id,
        reference: responseData.reference || request.reference,
        response: responseData, // Incluir resposta completa para debug
      };
    } else {
      // Melhorar mensagem de erro com detalhes da API
      let errorMessage = responseData.message 
        || responseData.error 
        || responseData.detail;
      
      // Se houver resposta do servidor M-Pesa, usar essa mensagem
      if (responseData.mpesa_server_response) {
        const mpesaResponse = responseData.mpesa_server_response;
        errorMessage = mpesaResponse.message 
          || mpesaResponse.error 
          || mpesaResponse.ResponseDescription
          || mpesaResponse.responseDescription
          || errorMessage;
      }
      
      if (!errorMessage) {
        errorMessage = `Erro ${response.status}: ${response.statusText}`;
      }
      
      return {
        success: false,
        message: errorMessage || 'Erro ao processar pagamento. Tente novamente.',
        status: response.status,
        details: responseData,
      };
    }
  } catch (error: any) {
    console.error('Payment API Error:', error);
    return {
      success: false,
      message: error.message || 'Erro de conexão. Verifique sua internet e tente novamente.',
      status: 0,
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

