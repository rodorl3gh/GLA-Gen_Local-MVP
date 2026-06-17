import { NextResponse } from "next/server";
import { getCatalogAll, createCatalogItem } from "@/lib/db";
import fs from "fs";
import path from "path";

const PUBLIC_UPLOADS = path.resolve(process.cwd(), "public", "uploads", "catalog");

export async function GET() {
  return NextResponse.json(getCatalogAll());
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || "";
    const price = parseFloat((formData.get("price") as string) || "0");
    const category = (formData.get("category") as string) || "";
    const file = formData.get("image") as File | null;

    if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    if (!fs.existsSync(PUBLIC_UPLOADS)) fs.mkdirSync(PUBLIC_UPLOADS, { recursive: true });

    let imagePath = "";
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || ".jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const fullPath = path.join(PUBLIC_UPLOADS, filename);
      fs.writeFileSync(fullPath, buffer);
      imagePath = `/uploads/catalog/${filename}`;
    }

    const id = createCatalogItem(name, description, price, category, imagePath);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
