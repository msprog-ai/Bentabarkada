// src/lib/paymentProvider.ts
// Payment provider abstraction for Bentabarkada

export interface PaymentProvider {
  /**
   * Initiates a payment and returns a payment session or URL.
   * @param amount Amount to charge (in PHP)
   * @param orderId The order ID
   * @param metadata Any extra metadata
   */
  createPaymentSession(amount: number, orderId: string, metadata?: Record<string, any>): Promise<{ url: string } | { sessionId: string }>;

  /**
   * Verifies a payment (webhook or polling)
   * @param sessionId The payment session ID
   */
  verifyPayment(sessionId: string): Promise<{ paid: boolean; details?: any }>;
}

// Manual payment provider (default)
export class ManualPaymentProvider implements PaymentProvider {
  async createPaymentSession(amount: number, orderId: string, metadata?: Record<string, any>) {
    // For manual payments, just return a placeholder
    return { url: '/checkout/manual-payment-info' };
  }
  async verifyPayment(sessionId: string) {
    // Always false for manual
    return { paid: false };
  }
}

// Example: PayMongo/Stripe provider can be added here in the future
// export class StripePaymentProvider implements PaymentProvider { ... }

// Usage: import { paymentProvider } from '@/lib/paymentProvider';
export const paymentProvider: PaymentProvider = new ManualPaymentProvider();
