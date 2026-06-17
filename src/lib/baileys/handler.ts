import type { WASocket, BaileysEventMap } from "@whiskeysockets/baileys";
import {
  getConversationByPhone,
  upsertConversation,
  insertMessage,
  getMessages,
  setConversationMode,
  getCatalog,
  getEnabledPaymentMethods,
} from "../db";
import { queueIncomingMessage, onFlushMessages, forceFlush } from "../buffer";
import { chatCompletion } from "../openai";
import { getActivePromptWithContext } from "../prompt-manager";
import { getActiveConfig } from "../agent-config";
import { formatCatalogForWhatsApp } from "../catalog";
import { formatPaymentMethods, formatPaymentMethodById } from "../payment";
import { getSocket } from "./state";

export function setMessageHandler(
  sock: WASocket,
  msg: BaileysEventMap["messages.upsert"]
) {
  for (const m of msg.messages) {
    if (m.key.fromMe) continue;
    if (m.key.remoteJid?.includes("@g.us")) continue;

    const text =
      m.message?.conversation ??
      m.message?.extendedTextMessage?.text ??
      "";

    if (!text) continue;

    const remoteJid = m.key.remoteJid ?? "";
    const phone = remoteJid.split("@")[0] ?? "unknown";
    if (phone === "unknown" || phone === "status") continue;

    upsertConversation(phone);

    const conv = getConversationByPhone(phone);
    if (!conv) continue;

    insertMessage(conv.id, "user", text);

    if (conv.mode === "HUMAN") {
      console.log(`[handler] modo HUMAN para ${phone}`);
      continue;
    }

    queueIncomingMessage(phone, text, remoteJid);
  }
}

onFlushMessages(async (phone, combinedText, jid) => {
  await processBatch(phone, combinedText, jid);
});

async function processBatch(phone: string, combinedText: string, remoteJid: string) {
  const conv = getConversationByPhone(phone);
  if (!conv) return;

  console.log(`[handler] procesando ${phone}: "${combinedText.slice(0, 80)}..."`);

  const lowerMsg = combinedText.toLowerCase().trim();

  // ── Pre-checks deterministicos (sin LLM) con datos en tiempo real ──

  // Mostrar catalogo
  if (/menu|catalogo|productos|ver productos|cartas|que (venden|tienen|hay|ofrecen)/i.test(lowerMsg)) {
    const catalogText = formatCatalogForWhatsApp();
    await sendAndSave(phone, conv.id, catalogText, remoteJid);
    return;
  }

  // Formas de pago
  if (/pago|pagar|metodo|transferencia|deposito|efectivo|paypal/i.test(lowerMsg)) {
    const paymentText = formatPaymentMethods();
    await sendAndSave(phone, conv.id, paymentText, remoteJid);
    return;
  }

  // Preguntar por un metodo de pago especifico
  if (/transferencia|deposito|bancaria|cuenta|banco|clabe/i.test(lowerMsg)) {
    const methods = getEnabledPaymentMethods();
    const transfer = methods.find((m: any) => m.name.toLowerCase().includes("transferencia"));
    if (transfer) {
      const text = formatPaymentMethodById(transfer.id);
      if (text) {
        await sendAndSave(phone, conv.id, text, remoteJid);
        return;
      }
    }
  }

  if (/paypal/i.test(lowerMsg)) {
    const methods = getEnabledPaymentMethods();
    const pp = methods.find((m: any) => m.name.toLowerCase().includes("paypal"));
    if (pp) {
      const text = formatPaymentMethodById(pp.id);
      if (text) {
        await sendAndSave(phone, conv.id, text, remoteJid);
        return;
      }
    }
  }

  // Saludos simples
  if (/^(hola|buen|hey|saludos|que tal|buenas)/i.test(lowerMsg) && lowerMsg.length < 30) {
    await sendAndSave(
      phone, conv.id,
      "Hola! Soy *Luna*, asistente virtual de *Cafeteria Luna Test*.\n\n" +
      "Escribe *menu* para ver nuestro catalogo.\n" +
      "Cuentame, en que puedo ayudarte?",
      remoteJid
    );
    return;
  }

  // Gracias / despedida
  if (/(gracias|adios|bye|nos vemos|hasta luego)/i.test(lowerMsg) && lowerMsg.length < 30) {
    await sendAndSave(phone, conv.id,
      "Gracias a ti! Estoy aqui cuando me necesites. Buen dia!", remoteJid);
    return;
  }

  // Transferir a humano
  if (/(humano|persona|asesor|gerente|encargado|hablar con)/i.test(lowerMsg)) {
    setConversationMode(conv.id, "HUMAN");
    await sendAndSave(phone, conv.id,
      "Claro, te conecto con un asesor humano. Un momento por favor...", remoteJid);
    return;
  }

  // Hacer pedido
  if (/(pedir|ordenar|comprar|quiero|encargar)/i.test(lowerMsg)) {
    await sendAndSave(phone, conv.id,
      "Perfecto! Para tomar tu pedido necesito:\n\n" +
      "1. Que producto(s) deseas?\n" +
      "2. Que cantidad?\n" +
      "3. Como pagaras?\n\n" +
      "Escribe *menu* si quieres ver el catalogo primero.", remoteJid);
    return;
  }

  // Precio / cuanto cuesta - mostrar catalogo
  if (/(precio|cuanto|cuesta|vale|sale)/i.test(lowerMsg)) {
    const catalogText = formatCatalogForWhatsApp();
    await sendAndSave(phone, conv.id,
      "Te comparto nuestros productos y precios:\n\n" + catalogText, remoteJid);
    return;
  }

  // Buscar producto especifico por nombre (real-time catalog search)
  const catalog = getCatalog();
  for (const item of catalog) {
    const itemNameLower = item.name.toLowerCase();
    if (lowerMsg.includes(itemNameLower)) {
      let text = `*${item.name}*\n\n`;
      if (item.description) text += `_${item.description}_\n\n`;
      text += `💰 *Precio: $${item.price.toFixed(0)}*\n`;
      text += `📂 Categoria: ${item.category || "General"}\n\n`;
      text += "Te gustaria pedir este producto? Escribe *pedir* para hacer tu orden.";
      await sendAndSave(phone, conv.id, text, remoteJid);
      return;
    }
  }

  // Horario
  if (/(horario|abren|cierran|atienden|hora)/i.test(lowerMsg)) {
    await sendAndSave(phone, conv.id,
      "Nuestro horario es de lunes a viernes de 7:00 a 21:00, sabados de 8:00 a 18:00, domingos de 9:00 a 14:00." +
      "\n\nPuedes consultar el horario actualizado en nuestro perfil.", remoteJid);
    return;
  }

  // Ubicacion / direccion
  if (/(ubicacion|direccion|donde|ubicados|maps)/i.test(lowerMsg)) {
    await sendAndSave(phone, conv.id,
      "Estamos ubicados en [direccion]. Buscanos en Google Maps como *Cafeteria Luna Test*!", remoteJid);
    return;
  }

  // Categoria de producto
  const categories = [...new Set(catalog.map((p: any) => p.category).filter(Boolean))] as string[];
  for (const cat of categories) {
    if (lowerMsg.includes(cat.toLowerCase())) {
      const catProducts = catalog.filter((p: any) => p.category === cat);
      let text = `*Productos en ${cat}:*\n\n`;
      for (const p of catProducts) {
        text += `  *${p.name}* — $${p.price.toFixed(0)}\n`;
        if (p.description) text += `  _${p.description}_\n\n`;
      }
      text += "Escribe el nombre del producto para mas detalles.";
      await sendAndSave(phone, conv.id, text, remoteJid);
      return;
    }
  }

  // ── Fallback: OpenAI SOLO para formatear respuesta con emojis, negritas, cursivas ──
  // El contexto real (catalogo, pagos) se inyecta en el prompt.
  const systemPrompt = getActivePromptWithContext();
  const config = getActiveConfig();
  const recentMessages = getMessages(conv.id, config.maxHistory) as any[];
  const history: { role: "user" | "assistant"; content: string }[] = recentMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await chatCompletion(systemPrompt, history, { max_tokens: 300 });
  if (response) {
    await sendAndSave(phone, conv.id, response, remoteJid);
  } else {
    await sendAndSave(phone, conv.id,
      "No entiendo bien eso. Escribe *menu* para ver productos o *pago* para formas de pago. Estoy aqui para ayudarte!", remoteJid);
  }
}

async function sendAndSave(
  phone: string, convId: number, text: string, remoteJid: string
) {
  insertMessage(convId, "assistant", text);

  try {
    const sock = getSocket();
    if (sock) {
      await sock.sendMessage(remoteJid, { text });
      console.log(`[handler] respuesta enviada a ${phone}`);
    } else {
      console.log("[handler] sin socket, mensaje guardado en BD");
    }
  } catch (err: any) {
    console.error("[handler] error enviando:", err?.message || err);
  }
}

export function switchConversationMode(phone: string, mode: "AI" | "HUMAN") {
  const conv = getConversationByPhone(phone);
  if (!conv) return;
  setConversationMode(conv.id, mode);
  if (mode === "HUMAN") forceFlush(phone);
}
