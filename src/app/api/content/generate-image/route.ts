import { NextRequest, NextResponse } from "next/server";

const KIE_BASE = "https://api.kie.ai/api/v1/jobs";

async function pollForResult(taskId: string, apiKey: string): Promise<string> {
  const url = `${KIE_BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`;

  for (let attempt = 0; attempt < 40; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt === 1 ? 4000 : 3000));

    try {
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const state = data.data?.state || data.state;

      if (state === "success") {
        const resultJson = data.data?.resultJson || data.resultJson;
        if (resultJson) {
          const parsed = typeof resultJson === "string" ? JSON.parse(resultJson) : resultJson;
          const urls = parsed.resultUrls || parsed.result_urls || [];
          if (urls.length > 0) return urls[0];
        }
      }
      if (state === "fail") {
        throw new Error(data.data?.failMsg || "Generation failed");
      }
    } catch (err: any) {
      if (err.message?.includes("Generation failed")) throw err;
      if (attempt >= 39) throw err;
    }
  }
  throw new Error("Timeout: imagen no completada en 2 minutos");
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio = "1:1", count = 1, inputImage } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt requerido" }, { status: 400 });
    }

    const numImages = Math.min(Math.max(Number(count) || 1, 1), 5);
    const apiKey = process.env.FLUX_API_KEY || process.env.BFL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "FLUX_API_KEY no configurada" }, { status: 500 });
    }

    const isImageToImage = !!inputImage;
    const model = isImageToImage ? "gpt-image-2-image-to-image" : "gpt-image-2-text-to-image";

    let absoluteImageUrl = inputImage;
    if (inputImage && !inputImage.startsWith("http")) {
      const host = req.headers.get("host") || "localhost:3000";
      const protocol = host.includes("localhost") ? "http" : "https";
      absoluteImageUrl = `${protocol}://${host}${inputImage}`;
      console.log(`[kie] Converted relative path to absolute: ${absoluteImageUrl}`);
    }

    const results: string[] = [];

    for (let i = 0; i < numImages; i++) {
      console.log(`[kie] Creating ${model} task ${i + 1}/${numImages}...`);

      const inputBody: any = { prompt };
      if (isImageToImage && absoluteImageUrl) {
        inputBody.input_urls = [absoluteImageUrl];
      }
      if (aspectRatio && aspectRatio !== "auto") {
        inputBody.aspect_ratio = aspectRatio;
      }
      if (!isImageToImage) {
        inputBody.resolution = "1K";
        inputBody.nsfw_checker = false;
      } else {
        inputBody.resolution = "1K";
      }

      const res = await fetch(`${KIE_BASE}/createTask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, input: inputBody }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return NextResponse.json({ error: "API key invalida" }, { status: 500 });
        }
        return NextResponse.json({ error: `Kie AI error (${res.status})` }, { status: 500 });
      }

      const data = await res.json();
      const taskId = data.data?.taskId || data.taskId;
      if (!taskId) {
        return NextResponse.json({ error: "No se pudo crear la tarea" }, { status: 500 });
      }

      console.log(`[kie] Task ${taskId}, polling...`);
      const imageUrl = await pollForResult(taskId, apiKey);
      results.push(imageUrl);
    }

    return NextResponse.json({ images: results, aspectRatio, count: results.length });
  } catch (err: any) {
    console.error("[generate-image] error:", err?.message || err);
    return NextResponse.json({ error: `Error: ${err?.message || "Error desconocido"}` }, { status: 500 });
  }
}
