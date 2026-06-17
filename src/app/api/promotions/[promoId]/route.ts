import { NextRequest, NextResponse } from "next/server";
import { updatePromotion, deletePromotion } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ promoId: string }> }
) {
  try {
    const { promoId } = await params;
    const body = await req.json();

    updatePromotion(Number(promoId), {
      name: body.name,
      description: body.description,
      price: body.price !== undefined ? Number(body.price) : undefined,
      type: body.type,
      imagePath: body.image_path,
      details: body.details,
      active: body.active !== undefined ? Number(body.active) : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ promoId: string }> }
) {
  const { promoId } = await params;
  deletePromotion(Number(promoId));
  return NextResponse.json({ success: true });
}
