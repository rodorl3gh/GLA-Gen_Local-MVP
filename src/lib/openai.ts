import OpenAI from "openai";
import { getActiveConfig } from "./agent-config";

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "sk-missing",
    timeout: 30000,
    maxRetries: 2,
  });
}

export async function chatCompletion(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<string | null> {
  const config = getActiveConfig();
  const client = getClient();

  console.log(`[openai] llamando a ${config.openaiModel} con ${messages.length} msgs`);

  try {
    const response = await client.chat.completions.create({
      model: config.openaiModel,
      temperature: options?.temperature ?? config.temperature,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      max_tokens: options?.max_tokens ?? 500,
    });

    const content = response.choices[0]?.message?.content ?? "";
    console.log(`[openai] respuesta (${content.length} chars)`);
    return content;
  } catch (err: any) {
    console.error("[openai] error:", err?.status, err?.message);
    if (err?.status === 429) return "Estoy recibiendo muchas solicitudes. Por favor espera un momento.";
    if (err?.status === 401) {
      console.error("[openai] API key invalida. Revisa OPENAI_API_KEY en .env.local");
      return "Error de configuracion del agente. Contacta al administrador.";
    }
    return "Lo siento, tuve un problema al procesar tu mensaje. Podrias intentarlo de nuevo?";
  }
}
