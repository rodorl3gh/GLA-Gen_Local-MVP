import { NextResponse } from "next/server";
import { getActivePrompt, saveAgentPrompt } from "@/lib/prompt-manager";

export async function GET() {
  return NextResponse.json({ prompt: getActivePrompt() });
}

export async function PUT(req: Request) {
  const { prompt } = (await req.json()) as { prompt: string };
  if (!prompt?.trim()) return NextResponse.json({ error: "Prompt requerido" }, { status: 400 });
  saveAgentPrompt(prompt);
  return NextResponse.json({ success: true });
}
