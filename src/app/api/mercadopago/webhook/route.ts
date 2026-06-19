import { NextResponse, NextRequest } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { updateOrderPayment, getOrderByMpPaymentId } from "@/lib/db";
import { notifyOwnerNewOrder } from "@/lib/notify-owner";

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || "";

const mpClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
const paymentApi = new Payment(mpClient);

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { action, data, type } = body;

    console.log("[Webhook POST] type:", type || action, "| data:", JSON.stringify(data));

    if (!action && !type) {
      return NextResponse.json({ ok: true, message: "Empty notification" });
    }

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
        return NextResponse.json({ ok: true, message: `Notification ${action || type} received` });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: true, message: err?.message || "Error" });
  }
}

export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get("topic");
  const paymentId = req.nextUrl.searchParams.get("id");

  console.log("[Webhook GET] topic:", topic, "| id:", paymentId);

  if (topic === "payment" && paymentId) {
    try {
      const payment = await paymentApi.get({ id: paymentId }).catch(() => null);
      if (payment) {
        const order = getOrderByMpPaymentId(paymentId);
        if (order) {
          const mpStatus = payment.status === "approved" ? "approved"
            : payment.status === "rejected" ? "rejected"
            : payment.status === "cancelled" ? "rejected"
            : payment.status === "refunded" ? "refunded"
            : "pending";

          updateOrderPayment(order.id, paymentId, mpStatus, payment);

          if (mpStatus === "approved" && order.payment_status !== "approved") {
            try { await notifyOwnerNewOrder(order.id, "Cafeteria Luna Test"); } catch {}
          }

          return NextResponse.json({ ok: true, orderId: order.id, paymentStatus: mpStatus });
        }
      }
      // Always return 200, even if order not found (MP test notification)
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ ok: true });
}
