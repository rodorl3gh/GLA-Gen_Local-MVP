import { NextRequest, NextResponse } from "next/server";
import { getPromotions, createPromotion } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getPromotions());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, price, type, details } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "Nombre y tipo requeridos" }, { status: 400 });
    }

    const id = createPromotion({
      name,
      description: description || "",
      price: Number(price) || 0,
      type: type === "package" ? "package" : "promotion",
      imagePath: body.image_path || "",
      details: Array.isArray(details) ? details : [],
    });

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
