import { NextResponse } from "next/server";
import { createCardPayment, createBankTransferPayment } from "@/lib/mercadopago";
import { createOrder, updateOrderPayment, updatePaymentStatus, insertPendingOrder, cleanExpiredPendingOrders } from "@/lib/db";
import { notifyOwnerNewOrder } from "@/lib/notify-owner";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      paymentType,
      token,
      paymentMethodId,
      installments,
      issuerId,
      payerEmail,
      payerFirstName,
      payerLastName,
      items,
      total,
      notes,
      phone,
      clientName,
      simulate,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0 || !total) {
      return NextResponse.json({ success: false, error: "Datos incompletos" }, { status: 400 });
    }

    if (!payerEmail && !simulate) {
      return NextResponse.json({ success: false, error: "Datos incompletos" }, { status: 400 });
    }

    const orderPhone = `${clientName || "Cliente"} - ${(phone || "").trim()}`;
    if (orderPhone === "Cliente -") {
      return NextResponse.json({ success: false, error: "Telefono requerido" }, { status: 400 });
    }

    const paymentMethodLabel = paymentType === "card" ? "Tarjeta" : paymentType === "transfer" ? "Transferencia" : "Efectivo";

    if (simulate) {
      const simulatedPaymentId = `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const orderId = createOrder(
        orderPhone, items, Number(total), paymentMethodLabel,
        notes || "", simulatedPaymentId, "approved",
        { simulated: true, id: simulatedPaymentId }
      );
      try { await notifyOwnerNewOrder(orderId, "Cafeteria Luna Test"); } catch {}
      return NextResponse.json({
        success: true, orderId, paymentStatus: "approved",
        mpPaymentId: simulatedPaymentId,
        paymentData: { simulated: true, status: "approved", statusDetail: "accredited", paymentMethodId: "simulated" },
      });
    }

    // Clean expired pending orders
    try { cleanExpiredPendingOrders(); } catch {}

    const payer = {
      email: payerEmail || "simulado@test.com",
      firstName: payerFirstName || clientName || "Cliente",
      lastName: payerLastName || "",
      identification: { type: "DNI", number: "12345678" },
    };

    const description = items.map((i: any) => `${i.name} x${i.quantity}`).join(", ").slice(0, 250);

    // Generate unique reference for this payment attempt
    const externalRef = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    let mpResult;

    if (paymentType === "card") {
      if (!token || !paymentMethodId) {
        return NextResponse.json({ success: false, error: "Datos de tarjeta incompletos" }, { status: 400 });
      }

      mpResult = await createCardPayment({
        amount: Number(total),
        token,
        paymentMethodId,
        installments: installments || 1,
        issuerId,
        payer,
        description,
        externalReference: externalRef,
      });
    } else if (paymentType === "transfer") {
      mpResult = await createBankTransferPayment({
        amount: Number(total),
        payer,
        description,
        externalReference: externalRef,
      });
    } else {
      return NextResponse.json({ success: false, error: "Tipo de pago invalido" }, { status: 400 });
    }

    if (!mpResult.success) {
      return NextResponse.json({ success: false, error: mpResult.error }, { status: 400 });
    }

    if (mpResult.status === "rejected") {
      return NextResponse.json({
        success: false,
        error: `Pago rechazado: ${mpResult.statusDetail || "motivo desconocido"}. Intenta con otra tarjeta.`,
        mpStatus: mpResult.status,
        mpStatusDetail: mpResult.statusDetail,
      }, { status: 400 });
    }

    if (mpResult.status === "approved") {
      // Payment is confirmed — create the order NOW
      const orderId = createOrder(
        orderPhone,
        items,
        Number(total),
        paymentMethodLabel,
        notes || "",
        mpResult.paymentId,
        "approved",
        mpResult.paymentData
      );

      try { await notifyOwnerNewOrder(orderId, "Cafeteria Luna Test"); } catch {}

      return NextResponse.json({
        success: true,
        orderId,
        paymentStatus: "approved",
        mpPaymentId: mpResult.paymentId,
        paymentData: {
          status: mpResult.status,
          statusDetail: mpResult.statusDetail,
          paymentMethodId: mpResult.paymentMethodId,
          ...(mpResult.paymentData?.transaction_details || {}),
          ...(mpResult.paymentData?.point_of_interaction || {}),
        },
      });
    }

    // Payment is pending (e.g. SPEI transfer) — store in pending_orders, webhook will create the order
    insertPendingOrder(
      externalRef,
      orderPhone,
      items,
      Number(total),
      paymentMethodLabel,
      notes || "",
      paymentType
    );

    // Also store the mpPaymentId in a temporary way so webhook can match
    // We update the pending_order record with a note about mpPaymentId
    // The webhook will find by external_reference and create the order

    return NextResponse.json({
      success: true,
      ref: externalRef,
      paymentStatus: "pending",
      mpPaymentId: mpResult.paymentId,
      paymentData: {
        status: mpResult.status,
        statusDetail: mpResult.statusDetail,
        paymentMethodId: mpResult.paymentMethodId,
        ...(mpResult.paymentData?.transaction_details || {}),
        ...(mpResult.paymentData?.point_of_interaction || {}),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Error desconocido" }, { status: 500 });
  }
}
