import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import P from "pino";
import fs from "fs";
import path from "path";
import { setConnectionState } from "../db";
import { setMessageHandler } from "./handler";
import { setSocket, getSocket } from "./state";

const AUTH_DIR = path.resolve(process.cwd(), "auth");
let shouldReconnect = true;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const logger = P({ level: "silent" });

export async function startBot(): Promise<void> {
  shouldReconnect = true;
  console.log("[baileys] iniciando bot...");

  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

  const { version } = await fetchLatestBaileysVersion();
  console.log(`[baileys] version: ${version.join(".")}`);

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    version,
    auth: state as any,
    browser: Browsers.macOS("Desktop"),
    logger,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    qrTimeout: 60000,
  });

  setSocket(sock);

  sock.ev.on("connection.update", (update) => {
    const { qr, connection, lastDisconnect } = update;

    if (qr) {
      console.log("[baileys] QR recibido");
      setConnectionState({ status: "qr", qrString: qr, phone: null });
    }

    if (connection === "connecting") {
      setConnectionState({ status: "connecting", qrString: null });
    }

    if (connection === "open") {
      console.log("[baileys] conectado");
      const phone = sock?.user?.id?.split(":")[0] ?? null;
      setConnectionState({ status: "connected", qrString: null, phone });
      console.log(`[baileys] conectado como: ${phone}`);
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      console.log(`[baileys] cerrado. codigo: ${statusCode}`);

      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        console.log("[baileys] sesion expirada. NO reconectando.");
        shouldReconnect = false;
        setConnectionState({ status: "disconnected", qrString: null, phone: null });
        cleanAuth();
        return;
      }

      setConnectionState({ status: "disconnected", qrString: null, phone: null });

      if (shouldReconnect) {
        if (statusCode === 440) {
          console.log("[baileys] 440: limpiando sesion");
          cleanAuth();
        }
        const delay = 3000;
        console.log(`[baileys] reconectando en ${delay}ms...`);
        reconnectTimer = setTimeout(() => startBot(), delay);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("messages.upsert", (msg) => {
    if (!sock) return;
    setMessageHandler(sock, msg);
  });
}

function cleanAuth() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      const files = fs.readdirSync(AUTH_DIR);
      for (const file of files) fs.unlinkSync(path.join(AUTH_DIR, file));
    }
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
  } catch (err) { console.error("[baileys] error limpiando auth:", err); }
}

export async function disconnectBot(): Promise<void> {
  shouldReconnect = false;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  const sock = getSocket();
  if (sock) {
    try { await sock.logout(); } catch {}
    setSocket(null);
  }
  setConnectionState({ status: "disconnected", qrString: null, phone: null });
  console.log("[baileys] desconectado.");
}
