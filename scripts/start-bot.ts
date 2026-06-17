import "./env-loader";

import { startBot } from "../src/lib/baileys/client";

console.log("=".repeat(50));
console.log("  Luna — Agente WhatsApp");
console.log("  Cafeteria Luna Test");
console.log("=".repeat(50));
console.log("");

startBot().catch((err) => {
  console.error("[start-bot] error fatal:", err);
  process.exit(1);
});
