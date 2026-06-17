import { getOwnerConfig, getOrderById } from "./db";
import { getSocket } from "./baileys/state";

export async function notifyOwnerNewOrder(
  orderId: number,
  negocioName: string
): Promise<boolean> {
  const config = getOwnerConfig();
  const order = getOrderById(orderId);
  if (!order) return false;

  const itemsText = order.items
    .map((i: any) => `  • ${i.name} x${i.quantity} — $${(i.price * i.quantity).toFixed(0)}`)
    .join("\n");

  const time = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const msg =
    `🍽️ *NUEVO PEDIDO — #${orderId}*\n\n` +
    `👤 *Cliente:* ${order.phone || "Sin nombre"}\n` +
    `🛒 *Items:*\n${itemsText}\n` +
    `\n💰 *Total: $${order.total.toFixed(0)}*\n` +
    `💳 *Pago:* ${order.payment_method || "No especificado"}\n` +
    `⏰ *Hora:* ${time}\n` +
    (order.notes ? `📝 *Notas:* ${order.notes}\n\n` : "\n") +
    `_Estado: PENDIENTE — Para actualizar usa el dashboard_`;

  try {
    if (config?.whatsapp_phone && config?.notify_orders) {
      const sock = getSocket();
      if (sock) {
        await sock.sendMessage(`${config.whatsapp_phone}@s.whatsapp.net`, { text: msg });
        console.log(`[notify] WhatsApp enviado al dueno ${config.whatsapp_phone}`);
        return true;
      }
    }
  } catch (err) {
    console.error("[notify] error WhatsApp:", err);
  }

  return false;
}

export async function notifyOwnerStatusChange(
  orderId: number,
  status: string,
  negocioName: string
): Promise<boolean> {
  const config = getOwnerConfig();
  if (!config?.whatsapp_phone || !config?.notify_orders) return false;

  const statusEmoji: Record<string, string> = {
    pending: "🕐",
    preparing: "👨‍🍳",
    delivered: "✅",
    cancelled: "❌",
  };

  const msg = `${statusEmoji[status] || ""} *Pedido #${orderId} — ${status.toUpperCase()}*\nRevisa el dashboard.`;

  try {
    const sock = getSocket();
    if (sock) {
      await sock.sendMessage(`${config.whatsapp_phone}@s.whatsapp.net`, { text: msg });
      return true;
    }
  } catch (err) {
    console.error("[notify] error:", err);
  }

  return false;
}
