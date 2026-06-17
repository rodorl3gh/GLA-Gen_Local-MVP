import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { prompt, instructions, product } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt requerido" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "sk-...") {
      return NextResponse.json({
        error: "API key de OpenAI no configurada.",
      }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey, timeout: 60000, maxRetries: 2 });

    let productContext = "";
    if (product && product.name) {
      productContext = `\nPRODUCTO: ${product.name} — ${product.description || ""} — $${Number(product.price || 0).toFixed(0)} (${product.category || ""})`;
    }

    let userMessage = prompt + productContext;
    if (instructions && instructions.trim()) {
      userMessage = `${instructions}\n\n${userMessage}`;
    }

    const systemPrompt = `Eres un copywriter experto en marketing para cafeterias y negocios locales en Mexico.

Tu tarea: generar un copy CORTO, PERSUASIVO y que VENDA, optimizado para ser renderizado sobre una imagen de producto.

REGLAS ESTRICTAS:
- MAXIMO 2-3 frases cortas (no mas de 40 palabras en total).
- Lenguaje natural, cercano, como lo escribiria el dueno del negocio.
- Incluye 1-2 emojis maximo.
- Siempre incluye un llamado a la accion claro.
- Genera de 3 a 5 hashtags relevantes en espanol.
- El copy debe generar interaccion, deseo o urgencia segun el tipo solicitado.
- Si hay un producto, menciona su nombre.

Responde SOLO en formato JSON:
{
  "caption": "copy corto aqui...",
  "hashtags": ["hashtag1", "hashtag2"],
  "tone": "tono usado",
  "target": "publico objetivo"
}

IMPORTANTE: Solo responde con el JSON, nada mas.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No se genero contenido." }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("[content:generate] error:", err?.message || err);
    return NextResponse.json({
      error: err?.status === 429
        ? "Limite de uso alcanzado."
        : err?.status === 401
          ? "Error de autenticacion con OpenAI."
          : `Error: ${err?.message || "Error desconocido"}`,
    }, { status: 500 });
  }
}
