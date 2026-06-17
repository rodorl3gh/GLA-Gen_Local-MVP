import { NextResponse } from "next/server";
import { getMessages, insertMessage, getConversationById } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  return NextResponse.json(getMessages(Number(conversationId)));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const { content } = (await req.json()) as { content: string };
  if (!content?.trim()) return NextResponse.json({ error: "Contenido requerido" }, { status: 400 });

  const conv = getConversationById(Number(conversationId));
  if (!conv) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  insertMessage(Number(conversationId), "human", content);

  try {
    const { sendText } = await import("@/lib/baileys/sender");
    await sendText(`${conv.phone}@s.whatsapp.net`, content);
  } catch {}

  return NextResponse.json({ success: true });
}
