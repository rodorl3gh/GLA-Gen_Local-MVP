import { NextResponse } from "next/server";
import { createPreference } from "@/lib/mercadopago";
import { createOrder } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, total, phone, clientName, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0 || !total) {
      return NextResponse.json({ success: false, error: "Datos incompletos" }, { status: 400 });
    }

    const orderPhone = `${clientName || "Cliente"} - ${(phone || "").trim()}`;
    const externalRef = `ORDER-${Date.now()}`;

    // Create the order first with pending status
    const orderId = createOrder(
      orderPhone.trim(),
      items,
      Number(total),
      "Tarjeta",
      notes || "",
      "",
      "pending",
      {}
    );

    const prefItems = items.map((i: any, idx: number) => ({
      id: String(idx + 1),
      title: i.name.slice(0, 50),
      quantity: i.quantity || 1,
      unit_price: Number(i.price || 0),
    }));

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin") || "https://gowlink-agency-test-luna.laeji7.easypanel.host";

    const result = await createPreference({
      items: prefItems,
      payer: clientName ? { name: clientName, email: `${clientName.toLowerCase().replace(/\s/g, "")}@cliente.com` } : undefined,
      externalReference: String(orderId),
      backUrls: {
        success: `${baseUrl}/menu/resultado?orderId=${orderId}&status=success`,
        failure: `${baseUrl}/menu/resultado?orderId=${orderId}&status=failure`,
        pending: `${baseUrl}/menu/resultado?orderId=${orderId}&status=pending`,
      },
      autoReturn: "approved",
    });

    if (!result.success || !result.initPoint) {
      return NextResponse.json({ success: false, error: result.error || "Error al crear preferencia" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId,
      preferenceId: result.preferenceId,
      initPoint: result.initPoint,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Error desconocido" }, { status: 500 });
  }
}
