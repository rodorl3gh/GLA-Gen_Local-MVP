const MP_MODE = process.env.MP_MODE || "production";
const MP_ACCESS_TOKEN = MP_MODE === "sandbox"
  ? (process.env.MERCADOPAGO_SANDBOX_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || "")
  : (process.env.MERCADOPAGO_ACCESS_TOKEN || "");
const MP_API_BASE = "https://api.mercadopago.com";

interface MpPaymentResult {
  success: boolean;
  paymentId?: string;
  status?: string;
  statusDetail?: string;
  paymentMethodId?: string;
  paymentData?: any;
  error?: string;
}

async function mpRequest(method: string, path: string, body?: any): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
  };

  if (method !== "GET") {
    headers["X-Idempotency-Key"] = crypto.randomUUID();
  }

  const res = await fetch(`${MP_API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { status: res.status, data };
}

export async function createCardPayment(params: {
  amount: number;
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: string;
  payer: {
    email: string;
    firstName?: string;
    lastName?: string;
    identification?: { type: string; number: string };
  };
  description?: string;
  externalReference?: string;
}): Promise<MpPaymentResult> {
  try {
    const body: any = {
      transaction_amount: params.amount,
      token: params.token,
      description: params.description || "Pedido",
      installments: params.installments,
      payment_method_id: params.paymentMethodId,
      payer: {
        email: params.payer.email,
        first_name: params.payer.firstName,
        last_name: params.payer.lastName,
        identification: params.payer.identification,
      },
    };

    if (params.issuerId) body.issuer_id = params.issuerId;
    if (params.externalReference) body.external_reference = params.externalReference;

    const { status, data } = await mpRequest("POST", "/v1/payments", body);

    if (status === 201 || status === 200) {
      return {
        success: true,
        paymentId: String(data.id),
        status: data.status,
        statusDetail: data.status_detail,
        paymentMethodId: data.payment_method_id,
        paymentData: data,
      };
    }

    return {
      success: false,
      error: data.message || data.cause?.[0]?.description || "Error al procesar el pago",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Error de conexion con Mercado Pago" };
  }
}

export async function createBankTransferPayment(params: {
  amount: number;
  payer: {
    email: string;
    firstName?: string;
    lastName?: string;
    identification?: { type: string; number: string };
  };
  description?: string;
  externalReference?: string;
}): Promise<MpPaymentResult> {
  try {
    const body: any = {
      transaction_amount: params.amount,
      description: params.description || "Pedido - Transferencia SPEI",
      payment_method_id: "spei",
      payer: {
        entity_type: "individual",
        email: params.payer.email,
        first_name: params.payer.firstName,
        last_name: params.payer.lastName,
        identification: params.payer.identification,
      },
    };

    if (params.externalReference) body.external_reference = params.externalReference;

    const { status, data } = await mpRequest("POST", "/v1/payments", body);

    if (status === 201 || status === 200) {
      return {
        success: true,
        paymentId: String(data.id),
        status: data.status,
        statusDetail: data.status_detail,
        paymentMethodId: "spei",
        paymentData: data,
      };
    }

    return {
      success: false,
      error: data.message || data.cause?.[0]?.description || "Error al generar la transferencia",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Error de conexion con Mercado Pago" };
  }
}

export async function getPayment(paymentId: string): Promise<any> {
  try {
    const { status, data } = await mpRequest("GET", `/v1/payments/${paymentId}`);
    if (status === 200) return data;
    return null;
  } catch {
    return null;
  }
}

export async function getPaymentMethods(): Promise<any[]> {
  try {
    const { status, data } = await mpRequest("GET", "/v1/payment_methods");
    if (status === 200) return Array.isArray(data) ? data : [];
    return [];
  } catch {
    return [];
  }
}
