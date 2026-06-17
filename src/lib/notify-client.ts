import { getOrderById } from "./db";
import { getSocket } from "./baileys/state";

export async function notifyClientStatusChange(
  orderId: number
): Promise<boolean> {
  const order = getOrderById(orderId);
  if (!order) return false;

  // Extract phone from the order - it may contain name info like "Juan - Mesa 5"
  const rawPhone = order.phone || "";
  const cleanPhone = rawPhone.split(" - ")[1] || rawPhone.split(" ").pop() || rawPhone;

  // Only send if it looks like a phone number (10+ digits) or mesa reference
  if (cleanPhone.startsWith("Mesa") || cleanPhone.length < 7) return false;

  const statusMessages: Record<string, string> = {
    preparing: `👨‍🍳 *Tu pedido #${orderId} está siendo preparado*\nTe avisamos cuando esté listo. ¡Gracias por tu paciencia!`,
    delivered: `✅ *Tu pedido #${orderId} está listo*\nPasa a recogerlo o se entregará en breve. ¡Buen provecho!`,
    cancelled: `❌ *Pedido #${orderId} cancelado*\nSi fue un error, contáctanos.`,
  };

  const msg = statusMessages[order.status] || null;
  if (!msg) return false;

  try {
    const sock = getSocket();
    if (!sock) return false;

    const jid = cleanPhone.includes("@s.whatsapp.net") ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: msg });
    console.log(`[notify-client] mensaje enviado a ${cleanPhone} sobre pedido #${orderId}`);
    return true;
  } catch (err) {
    console.error("[notify-client] error:", err);
    return false;
  }
}
