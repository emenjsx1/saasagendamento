/**
 * Dodo Payments Integration
 * Handles payment processing via Dodo Payments for card payments
 * Documentation: https://docs.dodopayments.com/introduction
 */

export interface DodoPaymentRequest {
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  reference: string;
  metadata?: Record<string, any>;
}

export interface DodoPaymentResponse {
  success: boolean;
  transaction_id?: string;
  payment_id?: string;
  checkout_url?: string;
  message?: string;
  error?: any;
}

/**
 * Initialize Dodo Payments Overlay Checkout
 * This loads the Dodo Payments script and initializes the checkout overlay
 */
export const initializeDodoPayments = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (window.dodoPayments) {
      resolve();
      return;
    }

    // Load Dodo Payments script
    const script = document.createElement('script');
    script.src = 'https://cdn.dodopayments.com/overlay.js';
    script.async = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load Dodo Payments script'));
    };
    document.head.appendChild(script);
  });
};

/**
 * Create a payment link using Dodo Payments API
 * This creates a payment link that can be used for checkout
 */
export const createDodoPaymentLink = async (
  request: DodoPaymentRequest
): Promise<DodoPaymentResponse> => {
  try {
    const DODO_API_KEY = import.meta.env.VITE_DODO_API_KEY;
    const DODO_PUBLIC_KEY = import.meta.env.VITE_DODO_PUBLIC_KEY;

    if (!DODO_API_KEY) {
      throw new Error('Dodo Payments API key not configured. Please set VITE_DODO_API_KEY in your environment variables.');
    }

    // Create payment link via Dodo Payments API
    const response = await fetch('https://api.dodopayments.com/v1/payment-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DODO_API_KEY}`,
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        customer_email: request.customerEmail,
        customer_name: request.customerName,
        reference: request.reference,
        metadata: request.metadata || {},
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || data.error || 'Erro ao criar link de pagamento',
        error: data,
      };
    }

    return {
      success: true,
      payment_id: data.id,
      checkout_url: data.checkout_url,
      transaction_id: data.id,
    };
  } catch (error: any) {
    console.error('Dodo Payments Error:', error);
    return {
      success: false,
      message: error.message || 'Erro ao processar pagamento com cartão',
      error: error,
    };
  }
};

/**
 * Open Dodo Payments Overlay Checkout
 * This opens the checkout overlay for card payments
 */
export const openDodoCheckout = async (
  request: DodoPaymentRequest
): Promise<DodoPaymentResponse> => {
  try {
    // Initialize Dodo Payments if not already loaded
    await initializeDodoPayments();

    // Create payment link first
    const paymentLinkResponse = await createDodoPaymentLink(request);

    if (!paymentLinkResponse.success || !paymentLinkResponse.checkout_url) {
      return paymentLinkResponse;
    }

    // Open overlay checkout
    if (window.dodoPayments && window.dodoPayments.open) {
      window.dodoPayments.open({
        paymentLinkId: paymentLinkResponse.payment_id,
        onSuccess: (payment: any) => {
          console.log('Payment successful:', payment);
        },
        onError: (error: any) => {
          console.error('Payment error:', error);
        },
        onClose: () => {
          console.log('Checkout closed');
        },
      });
    } else {
      // Fallback: redirect to checkout URL
      window.location.href = paymentLinkResponse.checkout_url;
    }

    return paymentLinkResponse;
  } catch (error: any) {
    console.error('Dodo Checkout Error:', error);
    return {
      success: false,
      message: error.message || 'Erro ao abrir checkout de pagamento',
      error: error,
    };
  }
};

/**
 * Process payment via Dodo Payments (redirect method)
 * This is a simpler approach that redirects to Dodo Payments checkout page
 */
export const processDodoPayment = async (
  request: DodoPaymentRequest
): Promise<DodoPaymentResponse> => {
  try {
    const paymentLinkResponse = await createDodoPaymentLink(request);

    if (!paymentLinkResponse.success || !paymentLinkResponse.checkout_url) {
      return paymentLinkResponse;
    }

    // Store payment reference and ID in sessionStorage for verification after redirect
    sessionStorage.setItem('dodo_payment_reference', request.reference);
    sessionStorage.setItem('dodo_payment_amount', request.amount.toString());
    sessionStorage.setItem('dodo_payment_currency', request.currency);
    if (paymentLinkResponse.payment_id) {
      sessionStorage.setItem('dodo_payment_id', paymentLinkResponse.payment_id);
    }

    // Redirect to checkout URL
    window.location.href = paymentLinkResponse.checkout_url;

    return paymentLinkResponse;
  } catch (error: any) {
    console.error('Dodo Payment Error:', error);
    return {
      success: false,
      message: error.message || 'Erro ao processar pagamento com cartão',
      error: error,
    };
  }
};

/**
 * Verify payment status via Dodo Payments API
 * This checks if a payment was successful
 */
export const verifyDodoPayment = async (
  paymentId: string
): Promise<DodoPaymentResponse> => {
  try {
    const DODO_API_KEY = import.meta.env.VITE_DODO_API_KEY;

    if (!DODO_API_KEY) {
      throw new Error('Dodo Payments API key not configured');
    }

    const response = await fetch(`https://api.dodopayments.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DODO_API_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || data.error || 'Erro ao verificar pagamento',
        error: data,
      };
    }

    const isPaid = data.status === 'paid' || data.status === 'completed';

    return {
      success: isPaid,
      transaction_id: data.id,
      payment_id: data.id,
      message: isPaid ? 'Pagamento confirmado' : 'Pagamento pendente',
    };
  } catch (error: any) {
    console.error('Dodo Payment Verification Error:', error);
    return {
      success: false,
      message: error.message || 'Erro ao verificar pagamento',
      error: error,
    };
  }
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    dodoPayments?: {
      open: (config: {
        paymentLinkId: string;
        onSuccess?: (payment: any) => void;
        onError?: (error: any) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

