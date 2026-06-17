import { NextResponse } from "next/server";
import { getOwnerConfig, updateOwnerConfig } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getOwnerConfig());
}

export async function PUT(req: Request) {
  const body = await req.json();
  updateOwnerConfig(body);
  return NextResponse.json({ success: true });
}
