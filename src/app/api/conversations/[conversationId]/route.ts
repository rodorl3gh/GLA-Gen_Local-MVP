import { NextResponse } from "next/server";
import { getConversationById, deleteConversation, setConversationMode } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const conv = getConversationById(Number(conversationId));
  return conv
    ? NextResponse.json(conv)
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  deleteConversation(Number(conversationId));
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const { mode } = (await req.json()) as { mode: "AI" | "HUMAN" };
  if (mode !== "AI" && mode !== "HUMAN") {
    return NextResponse.json({ error: "Modo invalido" }, { status: 400 });
  }
  setConversationMode(Number(conversationId), mode);
  return NextResponse.json({ success: true, mode });
}
