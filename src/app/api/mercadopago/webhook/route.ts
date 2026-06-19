import { NextResponse } from "next/server";
import { getPayment } from "@/lib/mercadopago";
import { updateOrderPayment, getOrderByMpPaymentId } from "@/lib/db";
import { notifyOwnerNewOrder } from "@/lib/notify-owner";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, data } = body;

    if (action !== "payment.updated" && action !== "payment.created") {
      return NextResponse.json({ ok: true });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      return NextResponse.json({ ok: false, error: "No payment ID" }, { status: 400 });
    }

    const payment = await getPayment(String(paymentId));
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
      try {
        await notifyOwnerNewOrder(order.id, "Cafeteria Luna Test");
      } catch {}
    }

    return NextResponse.json({ ok: true, orderId: order.id, paymentStatus: mpStatus });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Webhook de Mercado Pago activo" });
}
