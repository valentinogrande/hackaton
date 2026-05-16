// Payment gateway abstraction. Two adapters: Mock (default in MVP) and
// MercadoPago (activated once the MP MCP is installed in the CLI).

export type Currency = "ARS" | "USD";

export type PayOpts = {
  destinationCvu: string;
  amount: number;
  currency: Currency;
  externalReference: string;
  description: string;
};

export type PaymentRemoteStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "refunded"
  | "failed";

export type PayResult = {
  providerPaymentId: string;
  status: PaymentRemoteStatus;
  raw: unknown;
};

export type VerifyResult = {
  status: PaymentRemoteStatus;
  raw: unknown;
};

export type WebhookResult = {
  providerPaymentId: string;
  status: PaymentRemoteStatus;
  raw: unknown;
};

export interface PaymentGateway {
  readonly providerName: "mercadopago" | "mock";
  payToCvu(opts: PayOpts): Promise<PayResult>;
  verifyPayment(providerPaymentId: string): Promise<VerifyResult>;
  handleWebhook(body: unknown, headers: Headers): Promise<WebhookResult>;
}

class MockPaymentGateway implements PaymentGateway {
  readonly providerName = "mock" as const;

  async payToCvu(opts: PayOpts): Promise<PayResult> {
    const providerPaymentId = `mock_${crypto.randomUUID()}`;
    return {
      providerPaymentId,
      status: "approved",
      raw: { mock: true, ...opts, approved_at: new Date().toISOString() },
    };
  }

  async verifyPayment(providerPaymentId: string): Promise<VerifyResult> {
    return {
      status: "approved",
      raw: { mock: true, providerPaymentId, verified_at: new Date().toISOString() },
    };
  }

  async handleWebhook(body: unknown): Promise<WebhookResult> {
    const b = (body ?? {}) as { data?: { id?: string }; type?: string };
    return {
      providerPaymentId: b.data?.id ?? `mock_${Date.now()}`,
      status: "approved",
      raw: body,
    };
  }
}

/**
 * MercadoPagoGateway — stub.
 *
 * Activation path (when the MP MCP is installed and exposes payment tools,
 * or when the user prefers the REST SDK):
 *   1. Set `FINANCE_PAYMENT_GATEWAY=mercadopago` in env.
 *   2. Provide `MP_ACCESS_TOKEN` (test credentials work).
 *   3. Replace the bodies below with actual MP calls. The interface stays
 *      identical so callers don't change.
 *   4. For webhook signature verification, use `MP_WEBHOOK_SECRET` to
 *      validate the `x-signature` header (HMAC-SHA256 of the body).
 */
class MercadoPagoGateway implements PaymentGateway {
  readonly providerName = "mercadopago" as const;

  async payToCvu(_opts: PayOpts): Promise<PayResult> {
    throw new Error(
      "MercadoPagoGateway.payToCvu not wired yet — install MP MCP or REST SDK first",
    );
  }

  async verifyPayment(_providerPaymentId: string): Promise<VerifyResult> {
    throw new Error("MercadoPagoGateway.verifyPayment not wired yet");
  }

  async handleWebhook(_body: unknown, _headers: Headers): Promise<WebhookResult> {
    throw new Error("MercadoPagoGateway.handleWebhook not wired yet");
  }
}

export function getPaymentGateway(): PaymentGateway {
  const choice = (process.env.FINANCE_PAYMENT_GATEWAY ?? "mock").toLowerCase();
  if (choice === "mercadopago") return new MercadoPagoGateway();
  return new MockPaymentGateway();
}
