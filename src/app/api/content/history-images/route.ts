import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const dir = join(process.cwd(), "public", "uploads", "catalog");
    const files = await readdir(dir);
    const images = files
      .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
      .map(f => `/uploads/catalog/${f}`)
      .slice(-30);
    return NextResponse.json(images);
  } catch {
    return NextResponse.json([]);
  }
}
