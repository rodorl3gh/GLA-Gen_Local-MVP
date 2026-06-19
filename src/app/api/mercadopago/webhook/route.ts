import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { updateOrderPayment, getOrderByMpPaymentId } from "@/lib/db";
import { notifyOwnerNewOrder } from "@/lib/notify-owner";

const MP_MODE = process.env.MP_MODE || "production";
const MP_ACCESS_TOKEN = MP_MODE === "sandbox"
  ? (process.env.MERCADOPAGO_SANDBOX_ACCESS_TOKEN || "")
  : (process.env.MERCADOPAGO_ACCESS_TOKEN || "");

const mpClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
const paymentApi = new Payment(mpClient);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, data, type } = body;

    console.log("[Webhook] Recibido:", type || action, "| data:", JSON.stringify(data));

    switch (action || type) {
      case "payment.updated":
      case "payment.created": {
        const paymentId = data?.id;
        if (!paymentId) {
          return NextResponse.json({ ok: false, error: "No payment ID" }, { status: 400 });
        }

        const payment = await paymentApi.get({ id: String(paymentId) }).catch(() => null);
        if (!payment) {
          return NextResponse.json({ ok: true, message: "Payment not found (test or invalid)" });
        }

        const order = getOrderByMpPaymentId(String(paymentId));
        if (!order) {
          return NextResponse.json({ ok: true, message: "Order not found for this payment" });
        }

        const mpStatus = payment.status === "approved" ? "approved"
          : payment.status === "rejected" ? "rejected"
          : payment.status === "cancelled" ? "rejected"
          : payment.status === "refunded" ? "refunded"
          : "pending";

        updateOrderPayment(order.id, String(paymentId), mpStatus, payment);

        if (mpStatus === "approved" && order.payment_status !== "approved") {
          try { await notifyOwnerNewOrder(order.id, "Cafeteria Luna Test"); } catch {}
        }

        return NextResponse.json({ ok: true, orderId: order.id, paymentStatus: mpStatus });
      }

      case "subscription.updated":
      case "subscription.created":
        return NextResponse.json({ ok: true, message: "Subscription notif received" });

      case "plan.updated":
      case "plan.created":
        return NextResponse.json({ ok: true, message: "Plan notif received" });

      case "invoice.updated":
      case "invoice.created":
        return NextResponse.json({ ok: true, message: "Invoice notif received" });

      case "point_integration_wh":
        return NextResponse.json({ ok: true, message: "Point integration notif received" });

      default:
        return NextResponse.json({ ok: true, message: `Action ${action || type} not handled` });
    }
  } catch (err: any) {
    console.error("[Webhook] Error:", err?.message || err);
    return NextResponse.json({ ok: false, error: err.message || "Error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Webhook de Mercado Pago activo" });
}
