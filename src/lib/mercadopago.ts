import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

const MP_MODE = process.env.MP_MODE || "production";
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || "";

const mpClient = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN,
});

const paymentApi = new Payment(mpClient);

interface MpPaymentResult {
  success: boolean;
  paymentId?: string;
  status?: string;
  statusDetail?: string;
  paymentMethodId?: string;
  paymentData?: any;
  error?: string;
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

    console.log("[MP SDK] Modo:", MP_MODE, "| Token ends:", "..." + MP_ACCESS_TOKEN.slice(-15));
    console.log("[MP SDK] Creando pago — method:", params.paymentMethodId, "| amount:", params.amount, "| installments:", params.installments, "| token:", params.token.slice(0, 12) + "...");

    const result = await paymentApi.create({ body, requestOptions: { idempotencyKey: crypto.randomUUID() } });

    console.log("[MP SDK] Respuesta — id:", result.id, "| status:", result.status, "| detail:", result.status_detail);

    if (result.id) {
      return {
        success: true,
        paymentId: String(result.id),
        status: result.status,
        statusDetail: result.status_detail,
        paymentMethodId: result.payment_method_id,
        paymentData: result,
      };
    }

    return {
      success: false,
      error: "Error al procesar el pago",
    };
  } catch (err: any) {
    const mpError = err?.cause || err;
    console.error("[MP SDK] Error:", mpError?.message || err?.message || err);
    return {
      success: false,
      error: mpError?.description || mpError?.message || err?.message || "Error de conexion con Mercado Pago",
    };
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

    const result = await paymentApi.create({ body, requestOptions: { idempotencyKey: crypto.randomUUID() } });

    if (result.id) {
      return {
        success: true,
        paymentId: String(result.id),
        status: result.status,
        statusDetail: result.status_detail,
        paymentMethodId: "spei",
        paymentData: result,
      };
    }

    return {
      success: false,
      error: "Error al generar la transferencia",
    };
  } catch (err: any) {
    const mpError = err?.cause || err;
    return {
      success: false,
      error: mpError?.description || mpError?.message || err?.message || "Error de conexion con Mercado Pago",
    };
  }
}

export async function getPayment(paymentId: string): Promise<any> {
  try {
    const result = await paymentApi.get({ id: paymentId });
    return result;
  } catch {
    return null;
  }
}

export async function getPaymentMethods(): Promise<any[]> {
  try {
    const { MercadoPagoConfig, PaymentMethod } = await import("mercadopago");
    const pmClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    const pmApi = new PaymentMethod(pmClient);
    const result = await pmApi.get();
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export async function createPreference(params: {
  items: Array<{ id: string; title: string; quantity: number; unit_price: number }>;
  payer?: { name?: string; email?: string; phone?: { area_code: string; number: string } };
  externalReference?: string;
  backUrls?: { success?: string; failure?: string; pending?: string };
  autoReturn?: string;
}): Promise<{ success: boolean; preferenceId?: string; initPoint?: string; error?: string }> {
  try {
    const preferenceApi = new Preference(mpClient);
    const body: any = {
      items: params.items.map(i => ({
        id: i.id,
        title: i.title,
        quantity: i.quantity,
        unit_price: i.unit_price,
        currency_id: "MXN",
      })),
      back_urls: params.backUrls || {
        success: "",
        failure: "",
        pending: "",
      },
      auto_return: params.autoReturn || "all",
    };
    if (params.payer) body.payer = params.payer;
    if (params.externalReference) body.external_reference = params.externalReference;

    const result = await preferenceApi.create({ body, requestOptions: { idempotencyKey: crypto.randomUUID() } });

    return {
      success: true,
      preferenceId: result.id,
      initPoint: result.init_point,
    };
  } catch (err: any) {
    return { success: false, error: err?.cause?.description || err?.message || "Error al crear preferencia" };
  }
}
