// Payment gateway abstraction. Two adapters: Mock (default in MVP) and
// MercadoPago (stub — left for a future iteration; the integration is
// non-trivial because MP's public REST does not expose third-party CBU
// transfers without enterprise enablement).

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

class MercadoPagoGateway implements PaymentGateway {
  readonly providerName = "mercadopago" as const;

  async payToCvu(_opts: PayOpts): Promise<PayResult> {
    throw new Error(
      "MercadoPagoGateway no implementado — usá FINANCE_PAYMENT_GATEWAY=mock por ahora",
    );
  }

  async verifyPayment(_providerPaymentId: string): Promise<VerifyResult> {
    throw new Error("MercadoPagoGateway no implementado");
  }

  async handleWebhook(_body: unknown, _headers: Headers): Promise<WebhookResult> {
    throw new Error("MercadoPagoGateway no implementado");
  }
}

export function getPaymentGateway(): PaymentGateway {
  const choice = (process.env.FINANCE_PAYMENT_GATEWAY ?? "mock").toLowerCase();
  if (choice === "mercadopago") return new MercadoPagoGateway();
  return new MockPaymentGateway();
}
