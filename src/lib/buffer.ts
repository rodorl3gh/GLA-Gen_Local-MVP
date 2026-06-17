import { getActiveConfig } from "./agent-config";

type FlushCallback = (phone: string, combinedText: string, jid: string) => Promise<void>;

const messageBuffer = new Map<string, {
  texts: string[]; timer: ReturnType<typeof setTimeout> | null;
  processing: boolean; jid: string;
}>();

let flushCallback: FlushCallback | null = null;

export function onFlushMessages(cb: FlushCallback) { flushCallback = cb; }

export function queueIncomingMessage(phone: string, text: string, jid: string) {
  if (!flushCallback) { console.warn("[buffer] no callback registrado"); return; }

  let entry = messageBuffer.get(phone);
  if (!entry) { entry = { texts: [], timer: null, processing: false, jid }; messageBuffer.set(phone, entry); }

  entry.jid = jid;
  entry.texts.push(text);

  const config = getActiveConfig();
  const delay = config.burstDelayMs;

  if (entry.timer) clearTimeout(entry.timer);
  if (!entry.processing) { entry.timer = setTimeout(() => flushBuffer(phone), delay); }
}

export function forceFlush(phone: string) {
  const entry = messageBuffer.get(phone);
  if (entry && entry.timer) { clearTimeout(entry.timer); entry.timer = null; flushBuffer(phone); }
}

async function flushBuffer(phone: string) {
  const entry = messageBuffer.get(phone);
  if (!entry || entry.texts.length === 0 || entry.processing) return;

  entry.processing = true;
  const combinedText = entry.texts.join("\n");
  entry.texts = [];
  entry.timer = null;

  try { if (flushCallback) await flushCallback(phone, combinedText, entry.jid); }
  catch (err) { console.error(`[buffer] error ${phone}:`, err); }
  finally {
    await new Promise((r) => setTimeout(r, 800));
    entry.processing = false;
    if (entry.texts.length > 0) {
      const config = getActiveConfig();
      entry.timer = setTimeout(() => flushBuffer(phone), config.burstDelayMs);
    } else { messageBuffer.delete(phone); }
  }
}
