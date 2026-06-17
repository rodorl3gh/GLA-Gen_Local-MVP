import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { disconnectBot } = await import("@/lib/baileys/client");
    await disconnectBot();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

