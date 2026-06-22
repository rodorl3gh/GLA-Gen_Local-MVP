import { NextResponse, NextRequest } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { updateOrderPayment, getOrderByMpPaymentId, getOrderById, createOrder, getPendingOrderByRef, deletePendingOrder } from "@/lib/db";
import { notifyOwnerNewOrder } from "@/lib/notify-owner";

function getPaymentApi(): Payment {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
  return new Payment(new MercadoPagoConfig({ accessToken: token }));
}

async function handlePaymentConfirmation(paymentId: string) {
  const payment = await getPaymentApi().get({ id: paymentId }).catch(() => null);
  if (!payment) {
    console.log("[Webhook] Payment not found in MP:", paymentId);
    return { ok: true, message: "Payment not found (test or invalid)" };
  }

  const mpStatus = payment.status === "approved" ? "approved"
    : payment.status === "rejected" ? "rejected"
    : payment.status === "cancelled" ? "rejected"
    : payment.status === "refunded" ? "refunded"
    : "pending";

  const extRef = (payment as any).external_reference;

  console.log("[Webhook] paymentId:", paymentId, "| status:", payment.status, "| extRef:", extRef);

  // 1. Check if there's a pending_order waiting for this payment
  if (extRef) {
    const pending = getPendingOrderByRef(extRef);
    if (pending) {
      console.log("[Webhook] Found pending_order #", pending.id, "| ref:", extRef);

      if (mpStatus === "approved") {
        // Payment confirmed — CREATE THE ORDER NOW
        const orderId = createOrder(
          pending.phone,
          pending.items,
          pending.total,
          pending.payment_method,
          pending.notes || "",
          paymentId,
          "approved",
          payment
        );

        // Delete the pending record
        deletePendingOrder(extRef);

        // Notify owner
        try { await notifyOwnerNewOrder(orderId, "Cafeteria Luna Test"); } catch {}

        console.log("[Webhook] Order created from pending:", orderId);
        return { ok: true, orderId, paymentStatus: "approved", source: "pending_orders" };
      }

      if (mpStatus === "rejected" || mpStatus === "refunded") {
        // Payment failed — keep the pending record so retries with same preference work
        console.log("[Webhook] Payment rejected, keeping pending_order for retry:", extRef);
        return { ok: true, message: "Payment rejected, pending order kept", paymentStatus: mpStatus };
      }

      // Still pending — do nothing, wait for next webhook
      return { ok: true, message: "Awaiting payment confirmation", paymentStatus: mpStatus };
    }

    // pending_order NOT found but payment is approved — create order from payment data
    if (mpStatus === "approved") {
      const payerName = (payment as any).payer?.first_name || "";
      const payerEmail = (payment as any).payer?.email || "";
      const description = (payment as any).description || "Pedido desde MercadoPago";
      const amount = (payment as any).transaction_amount || 0;
      const items = [{ name: description.slice(0, 100), quantity: 1, price: amount }];
      const phone = `${payerName} (${payerEmail})`.trim() || "Cliente MP";

      const orderId = createOrder(
        phone,
        items,
        amount,
        "Tarjeta",
        `Ref: ${extRef}`,
        paymentId,
        "approved",
        payment
      );

      try { await notifyOwnerNewOrder(orderId, "Cafeteria Luna Test"); } catch {}

      console.log("[Webhook] Order created from payment data (fallback):", orderId);
      return { ok: true, orderId, paymentStatus: "approved", source: "payment_fallback" };
    }
  }

  // 2. Fallback: try to find an existing order by mp_payment_id (simulated or pre-existing)
  const order = getOrderByMpPaymentId(paymentId);
  if (order) {
    updateOrderPayment(order.id, paymentId, mpStatus, payment);

    if (mpStatus === "approved" && order.payment_status !== "approved") {
      try { await notifyOwnerNewOrder(order.id, "Cafeteria Luna Test"); } catch {}
    }

    return { ok: true, orderId: order.id, paymentStatus: mpStatus, source: "orders" };
  }

  // 3. Try fallback: extRef matching an existing order ID (for preference flow with old-style orders)
  if (extRef) {
    const orderId = Number(extRef);
    if (!isNaN(orderId)) {
      const fallbackOrder = getOrderById(orderId);
      if (fallbackOrder) {
        updateOrderPayment(fallbackOrder.id, paymentId, mpStatus, payment);
        if (mpStatus === "approved" && fallbackOrder.payment_status !== "approved") {
          try { await notifyOwnerNewOrder(fallbackOrder.id, "Cafeteria Luna Test"); } catch {}
        }
        return { ok: true, orderId: fallbackOrder.id, paymentStatus: mpStatus, source: "orders_by_extref" };
      }
    }
  }

  console.log("[Webhook] No pending_order or order found for payment:", paymentId);
  return { ok: true, message: "No matching order found" };
}

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

        const result = await handlePaymentConfirmation(String(paymentId));
        return NextResponse.json(result);
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
      const result = await handlePaymentConfirmation(paymentId);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ ok: true });
}
