import { NextResponse } from "next/server";
import { getPaymentMethods, updatePaymentMethod, createPaymentMethod } from "@/lib/db";

export async function GET() {
  const methods = getPaymentMethods();
  return NextResponse.json(methods);
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, enabled, details } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    updatePaymentMethod(id, { name, enabled, details });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, enabled, details } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const id = createPaymentMethod(name.trim(), enabled ? 1 : 0, details || []);
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    if (err?.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "Ya existe un metodo con ese nombre" }, { status: 409 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
