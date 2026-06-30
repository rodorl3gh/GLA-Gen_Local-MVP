import { NextRequest, NextResponse } from "next/server";

function generatePollinationsUrl(prompt: string, width: number, height: number, seed?: number): string {
  const encoded = encodeURIComponent(prompt);
  let url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&model=flux`;
  if (seed !== undefined) url += `&seed=${seed}`;
  return url;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio = "1:1", count = 1 } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt requerido" }, { status: 400 });
    }

    const numImages = Math.min(Math.max(Number(count) || 1, 1), 5);
    const results: string[] = [];

    let width = 1024;
    let height = 1024;
    if (aspectRatio === "16:9") { width = 1280; height = 720; }
    else if (aspectRatio === "9:16") { width = 720; height = 1280; }
    else if (aspectRatio === "4:3") { width = 1024; height = 768; }
    else if (aspectRatio === "3:4") { width = 768; height = 1024; }

    for (let i = 0; i < numImages; i++) {
      const seed = Date.now() + i;
      const imageUrl = generatePollinationsUrl(prompt, width, height, seed);
      console.log(`[pollinations] Generated image ${i + 1}/${numImages}`);
      results.push(imageUrl);
    }

    return NextResponse.json({ images: results, count: results.length });
  } catch (err: any) {
    console.error("[generate-image] error:", err?.message || err);
    return NextResponse.json({ error: `Error: ${err?.message || "Error desconocido"}` }, { status: 500 });
  }
}
