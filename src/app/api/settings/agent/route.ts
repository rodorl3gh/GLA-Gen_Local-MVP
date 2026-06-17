import { NextResponse } from "next/server";
import { getActiveConfig, updateAgentConfig } from "@/lib/agent-config";

export async function GET() {
  return NextResponse.json(getActiveConfig());
}

export async function PUT(req: Request) {
  const body = await req.json();
  updateAgentConfig(body);
  return NextResponse.json({ success: true });
}
