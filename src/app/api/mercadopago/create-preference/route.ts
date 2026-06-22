import { NextResponse } from "next/server";
import { createPreference } from "@/lib/mercadopago";
import { insertPendingOrder, cleanExpiredPendingOrders } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, total, phone, clientName, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0 || !total) {
      return NextResponse.json({ success: false, error: "Datos incompletos" }, { status: 400 });
    }

    const orderPhone = `${clientName || "Cliente"} - ${(phone || "").trim()}`;

    // Clean expired pending orders
    try { cleanExpiredPendingOrders(); } catch {}

    // Generate unique reference — will be used as MP external_reference
    const externalRef = `PREF-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Store order data in pending_orders — NOT in orders yet
    // The order will only be created when the webhook confirms payment
    insertPendingOrder(
      externalRef,
      orderPhone,
      items,
      Number(total),
      "Tarjeta",
      notes || "",
      "preference"
    );

    const prefItems = items.map((i: any, idx: number) => ({
      id: String(idx + 1),
      title: i.name.slice(0, 50),
      description: i.name.slice(0, 120),
      quantity: i.quantity || 1,
      unit_price: Number(i.price || 0),
    }));

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin") || "https://gowlink-agency-test-luna.laeji7.easypanel.host";

    const result = await createPreference({
      items: prefItems,
      payer: clientName ? { name: clientName, email: `${clientName.toLowerCase().replace(/\s/g, "")}@cliente.com` } : undefined,
      externalReference: externalRef,
      statementDescriptor: "CAFETERIALUNATEST",
      backUrls: {
        success: `${baseUrl}/menu/resultado?ref=${externalRef}&result=success`,
        failure: `${baseUrl}/menu/resultado?ref=${externalRef}&result=failure`,
        pending: `${baseUrl}/menu/resultado?ref=${externalRef}&result=pending`,
      },
      autoReturn: "approved",
    });

    if (!result.success || !result.initPoint) {
      return NextResponse.json({ success: false, error: result.error || "Error al crear preferencia" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ref: externalRef,
      preferenceId: result.preferenceId,
      initPoint: result.initPoint,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Error desconocido" }, { status: 500 });
  }
}
