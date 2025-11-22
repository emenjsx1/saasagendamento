import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Token padrão (expira em 2026)
const DEFAULT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5ZjkwMzg2Mi1hNzgwLTQ0MGQtOGVkNS1iOGQ4MDkwYjE4MGUiLCJqdGkiOiIzMjI0ZTdiZWJmOTY3MDc4OWE4MWUyZWUwMDg2ZTY2MmM4NTYxYjlkY2UxNzVjZGQzNTk2ODBjYTU2NTU0OGNlY2Q2YTIxZjJiMWJjMTQ0YiIsImlhdCI6MTc1NTYwNzI2Ni41MjcyNzgsIm5iZiI6MTc1NTYwNzI2Ni41MjcyODEsImV4cCI6MTc4NzE0MzI2Ni41MjM2Nywic3ViIjoiIiwic2NvcGVzIjpbXX0.NEJzqLOaMnaI4iq3OMhhXAYLHDFY_JAq45JiQVfrJDoXQVcrVR0hD0tGslRUfyn-UA6gst5CXDBbeJc4l7C8FDxJYKQffbl_w12AwLQMj0wOoV9zp_dLSsgjwbwwyoyOWaP0WXMfLZOglZI2uW1tlN00uk17gZzLjtyE2M5TWPdwsaFyMkb6PpquQNB7hAnoOYWLYza66ME7F7rP7uv0qJ1w-PIj6MsjHy8ar5Dm67ISicu0sSi1WS_8XIxVAOX1zlHUQweQTvlOQILN9W1tc2-F0mRMPxAoNwOLd641puUikL33-f5Dt0hPFceKXIM6E4hCqQX4Vgq1KMYtFNdCahqFqbjupTbQPESCXEK1coGtS76p7ArsyOZALreo18xZqvJ0wQF4XYl0qab7rvbFmypDQU19R3bEsW4rAH84g9WspdF86TNZeqefqQ3JqGgqis7FekC-wdWhS3qnM5CElzLmGNpnyqHJ7lHMDuup9ejWHjNtG64E2QqCnj6UA_ACCo14LFdReT2RAySXi58Mvv8bb47XpT1xPNFBzRGQq6u9WZCHFyO07tCPmBBeinS4oElkG1upXRvE8pO7U3plzmkBOTByMDmSnBXcFDOadwym8LYfk7SYqWSSN9-0k0kFdt8gsQpAmtKCrs_hbfihhccfbHhf4HHis23W7-kTCUs';

const CLIENT_ID = '9f903862-a780-440d-8ed5-b8d8090b180e';

// Validar número de telefone (Moçambique: 84, 85, 86, 87 - 9 dígitos)
function validatePhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return /^(84|85|86|87)\d{7}$/.test(digits);
}

serve(async (req) => {
  // Handle CORS preflight - CRÍTICO: Deve retornar antes de qualquer validação JWT
  // Se JWT verification estiver h abilitada no Supabase, isso pode não funcionar
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, // 204 No Content é padrão para OPTIONS
      headers: corsHeaders
    });
  }

  try {
    // Ler o body apenas se houver conteúdo
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Corpo da requisição inválido ou vazio' 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { amount, phone, method, reference } = requestData;

    // Validações
    if (!amount || !phone || !method || !reference) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Campos obrigatórios: amount, phone, method, reference' 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!['mpesa', 'emola'].includes(method)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Método inválido. Use "mpesa" ou "emola"' 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!validatePhoneNumber(phone)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Número de telefone inválido. Use um número válido de Moçambique (84, 85, 86, 87) com 9 dígitos.' 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar valor mínimo
    const amountNum = typeof amount === 'number' ? amount : parseFloat(amount);
    if (amountNum < 1 || isNaN(amountNum)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Valor mínimo de pagamento é 1 MZN.' 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Limpar número de telefone (9 dígitos sem código do país)
    let phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.startsWith('258')) {
      phoneDigits = phoneDigits.substring(3);
    } else if (phoneDigits.startsWith('00258')) {
      phoneDigits = phoneDigits.substring(5);
    }

    if (phoneDigits.length !== 9) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Número de telefone deve ter 9 dígitos (ex: 84XXXXXXX).' 
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Limpar referência
    let cleanReference = reference
      .replace(/[^a-zA-Z0-9_]/g, '')
      .substring(0, 20);
    
    if (!cleanReference) {
      cleanReference = `order_${Date.now()}`;
    }

    // Obter credenciais (usar variáveis de ambiente ou valores padrão)
    const accessToken = Deno.env.get(`${method.toUpperCase()}_ACCESS_TOKEN`) || DEFAULT_TOKEN;
    const walletId = method === 'mpesa' 
      ? (Deno.env.get('MPESA_WALLET_ID') || '993607')
      : (Deno.env.get('EMOLA_WALLET_ID') || '993606');

    // Montar URL da API
    const apiUrl = `https://mpesaemolatech.com/v1/c2b/${method}-payment/${walletId}`;

    // Payload
    const requestBody = {
      client_id: CLIENT_ID,
      amount: Number(amountNum),
      phone: phoneDigits,
      reference: cleanReference,
    };

    console.log('📤 Processando pagamento:', {
      method,
      walletId,
      amount: amountNum,
      phone: phoneDigits,
      reference: cleanReference,
    });

    // Adicionar timeout de 30 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let apiResponse: Response;
    try {
      apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('❌ Timeout ao processar pagamento');
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Tempo de espera excedido. Tente novamente.',
            status: 408,
          }),
          {
            status: 408,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      throw error;
    }

    const responseText = await apiResponse.text();
    let responseData: any = {};
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao parsear resposta JSON:', responseText);
      responseData = { message: responseText || 'Resposta inválida da API' };
    }

    console.log('📥 Resposta da API:', {
      status: apiResponse.status,
      data: responseData,
    });

    // Tratar sucesso (200 ou 201)
    if (apiResponse.status === 200 || apiResponse.status === 201) {
      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: responseData.transaction_id 
            || responseData.reference 
            || responseData.id
            || responseData.transactionId
            || responseData.order_id,
          reference: responseData.reference || cleanReference,
          response: responseData,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Tratar erro
    let errorMessage = responseData.message 
      || responseData.error 
      || responseData.detail;
    
    if (responseData.mpesa_server_response) {
      const mpesaResponse = responseData.mpesa_server_response;
      errorMessage = mpesaResponse.message 
        || mpesaResponse.error 
        || mpesaResponse.ResponseDescription
        || mpesaResponse.responseDescription
        || errorMessage;
    }
    
    if (!errorMessage) {
      errorMessage = `Erro ${apiResponse.status}: ${apiResponse.statusText}`;
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || 'Erro ao processar pagamento. Tente novamente.',
        status: apiResponse.status,
        details: responseData,
      }),
      {
        status: apiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Erro ao processar pagamento. Tente novamente.',
        status: 500,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

