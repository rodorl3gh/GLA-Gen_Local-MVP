import { NextResponse } from "next/server";
import { getConnectionState } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getConnectionState());
}

