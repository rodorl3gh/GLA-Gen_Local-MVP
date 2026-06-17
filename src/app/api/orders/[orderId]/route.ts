import { NextResponse } from "next/server";
import { getOrderById, updateOrderStatus } from "@/lib/db";
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
  const { status } = (await req.json()) as {
    status: "pending" | "preparing" | "delivered" | "cancelled" | "expirado";
  };

  if (!["pending", "preparing", "delivered", "cancelled", "expirado"].includes(status)) {
    return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
  }

  updateOrderStatus(Number(orderId), status);

  // Notificar al dueño del cambio de estado
  try { await notifyOwnerStatusChange(Number(orderId), status, "Cafeteria Luna Test"); } catch {}

  // Notificar al cliente si su pedido está listo o preparándose
  try { await notifyClientStatusChange(Number(orderId)); } catch {}

  return NextResponse.json({ success: true, status });
}
