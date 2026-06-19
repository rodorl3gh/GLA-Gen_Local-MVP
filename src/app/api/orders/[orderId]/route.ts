import { NextResponse } from "next/server";
import { getOrderById, updateOrderStatus, updatePaymentStatus } from "@/lib/db";
import { notifyOwnerStatusChange } from "@/lib/notify-owner";
import { notifyClientStatusChange } from "@/lib/notify-client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const order = getOrderById(Number(orderId));
  return order
    ? NextResponse.json(order)
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const body = await req.json();

  // Update order status
  if (body.status) {
    const status = body.status as string;
    if (!["pending", "preparing", "delivered", "cancelled", "expirado"].includes(status)) {
      return NextResponse.json({ error: "Estado de pedido invalido" }, { status: 400 });
    }
    updateOrderStatus(Number(orderId), status as any);
    try { await notifyOwnerStatusChange(Number(orderId), status, "Cafeteria Luna Test"); } catch {}
    try { await notifyClientStatusChange(Number(orderId)); } catch {}
    return NextResponse.json({ success: true, status });
  }

  // Update payment status
  if (body.payment_status) {
    const order = getOrderById(Number(orderId));
    if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    if (order.payment_method === "Tarjeta") {
      return NextResponse.json({ error: "El estado de pago de tarjeta solo se actualiza via webhook de Mercado Pago" }, { status: 403 });
    }

    const ps = body.payment_status as string;
    if (!["pending", "approved", "rejected"].includes(ps)) {
      return NextResponse.json({ error: "Estado de pago invalido" }, { status: 400 });
    }
    updatePaymentStatus(Number(orderId), ps);
    return NextResponse.json({ success: true, payment_status: ps });
  }

  return NextResponse.json({ error: "status o payment_status requerido" }, { status: 400 });
}
