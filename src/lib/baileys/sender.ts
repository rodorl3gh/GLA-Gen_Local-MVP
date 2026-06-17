import { getSocket } from "./state";

export async function sendText(jid: string, text: string): Promise<boolean> {
  try {
    const sock = getSocket();
    if (!sock) return false;
    await sock.sendMessage(jid, { text });
    return true;
  } catch (err) { console.error("[sender] error:", err); return false; }
}
