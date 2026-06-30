import { NextResponse } from "next/server";
import { createOrder } from "@/lib/db";
import { notifyOwnerNewOrder } from "@/lib/notify-owner";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, name, items, total, payment_method, notes } = body;

    if (!phone || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const effectivePhone = phone === "POS" && name ? name : phone;

    const orderId = createOrder(
      effectivePhone,
      items,
      total || 0,
      payment_method || "No especificado",
      notes || ""
    );

    try {
      await notifyOwnerNewOrder(orderId, "Cafeteria Luna Test");
    } catch {}

    return NextResponse.json({ success: true, orderId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
