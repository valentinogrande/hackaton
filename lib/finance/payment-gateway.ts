// Payment gateway abstraction. Two adapters: Mock (default) and MercadoPago.
// Switch by setting FINANCE_PAYMENT_GATEWAY=mercadopago in env.

import crypto from "node:crypto";

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

// ============================================================
// MercadoPago — sandbox-ready
// ============================================================
//
// Limitation worth knowing: MP's public REST API does NOT support
// direct transfers to a third-party CBU/CVU. That's reserved for
// MP Empresarial / "money out". For the demo this gateway creates
// a regular payment record in MP referencing the withdrawal, which
// is enough to exercise the full create → webhook → status flow.
// In production, swap the body shape for the appropriate payout
// endpoint once your MP account is enabled.

const MP_API = "https://api.mercadopago.com";

function mpStatusToInternal(s: string | undefined | null): PaymentRemoteStatus {
  switch (s) {
    case "approved":
      return "approved";
    case "pending":
      return "pending";
    case "in_process":
    case "authorized":
      return "submitted";
    case "rejected":
    case "cancelled":
      return "rejected";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}

class MercadoPagoGateway implements PaymentGateway {
  readonly providerName = "mercadopago" as const;

  private get token(): string {
    const t = process.env.MP_ACCESS_TOKEN;
    if (!t) throw new Error("Falta MP_ACCESS_TOKEN en el entorno");
    return t;
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown; idempotencyKey?: string } = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
    if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;

    const res = await fetch(`${MP_API}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
      // MP doesn't tolerate caching on the call path.
      cache: "no-store",
    });

    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const detail =
        (json && (json.message || json.error)) || `MP HTTP ${res.status}`;
      throw new Error(`MercadoPago: ${detail}`);
    }
    return json as T;
  }

  async payToCvu(opts: PayOpts): Promise<PayResult> {
    // Test-mode payer. Real production usage requires a configured payer + payout-enabled account.
    const body = {
      transaction_amount: Math.round(opts.amount * 100) / 100,
      description: opts.description,
      payment_method_id: "account_money",
      payer: { email: "test_payer@studypay.test" },
      external_reference: opts.externalReference,
      metadata: {
        destination_cvu: opts.destinationCvu,
        currency: opts.currency,
      },
    };

    const json = await this.request<{
      id: number | string;
      status: string;
      [k: string]: unknown;
    }>("/v1/payments", {
      method: "POST",
      body,
      idempotencyKey: `studypay-${opts.externalReference}`,
    });

    return {
      providerPaymentId: String(json.id),
      status: mpStatusToInternal(json.status),
      raw: json,
    };
  }

  async verifyPayment(providerPaymentId: string): Promise<VerifyResult> {
    const json = await this.request<{ status: string; [k: string]: unknown }>(
      `/v1/payments/${encodeURIComponent(providerPaymentId)}`
    );
    return {
      status: mpStatusToInternal(json.status),
      raw: json,
    };
  }

  async handleWebhook(body: unknown): Promise<WebhookResult> {
    // MP webhook envelope: { action, type, data: { id } }
    const b = (body ?? {}) as { type?: string; data?: { id?: string | number } };
    const id = b.data?.id;
    if (!id) throw new Error("MP webhook sin data.id");
    if (b.type && b.type !== "payment") {
      // Non-payment events: ack but treat as pending so we don't override status.
      return { providerPaymentId: String(id), status: "pending", raw: body };
    }
    const verified = await this.verifyPayment(String(id));
    return {
      providerPaymentId: String(id),
      status: verified.status,
      raw: verified.raw,
    };
  }
}

export function getPaymentGateway(): PaymentGateway {
  const choice = (process.env.FINANCE_PAYMENT_GATEWAY ?? "mock").toLowerCase();
  if (choice === "mercadopago") return new MercadoPagoGateway();
  return new MockPaymentGateway();
}
