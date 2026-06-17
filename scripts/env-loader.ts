import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

console.log("[env] .env.local cargado");
console.log("[env] OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "configurada" : "NO CONFIGURADA");
console.log("[env] OWNER_WHATSAPP:", process.env.OWNER_WHATSAPP || "no definido");
