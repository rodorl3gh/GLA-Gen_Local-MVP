import { NextResponse } from "next/server";
import { getCatalogItem, updateCatalogItem, deleteCatalogItem } from "@/lib/db";
import fs from "fs";
import path from "path";

const PUBLIC_UPLOADS = path.resolve(process.cwd(), "public", "uploads", "catalog");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const item = getCatalogItem(Number(itemId));
  return item
    ? NextResponse.json(item)
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  try {
    const formData = await req.formData();
    const name = (formData.get("name") as string) || "";
    const description = (formData.get("description") as string) || "";
    const price = parseFloat((formData.get("price") as string) || "0");
    const category = (formData.get("category") as string) || "";
    const file = formData.get("image") as File | null;

    let imagePath: string | undefined;
    if (file) {
      if (!fs.existsSync(PUBLIC_UPLOADS)) fs.mkdirSync(PUBLIC_UPLOADS, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || ".jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const fullPath = path.join(PUBLIC_UPLOADS, filename);
      fs.writeFileSync(fullPath, buffer);
      imagePath = `/uploads/catalog/${filename}`;
    }

    updateCatalogItem(Number(itemId), name, description, price, category, imagePath);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  deleteCatalogItem(Number(itemId));
  return NextResponse.json({ success: true });
}
