import { NextResponse } from "next/server";
import { spawn } from "child_process";

let botProcess: ReturnType<typeof spawn> | null = null;

export async function POST() {
  try {
    if (botProcess && botProcess.exitCode === null) {
      return NextResponse.json({ success: true, message: "Bot ya corriendo" });
    }

    botProcess = spawn("npx", ["-y", "tsx", "scripts/start-bot.ts"], {
      cwd: process.cwd(),
      stdio: "pipe",
      env: { ...process.env },
      shell: true,
    });

    botProcess.stdout?.on("data", (d: Buffer) => console.log("[bot]", d.toString().trim()));
    botProcess.stderr?.on("data", (d: Buffer) => console.error("[bot:err]", d.toString().trim()));
    botProcess.on("close", (code) => { console.log(`[api] bot cerrado codigo ${code}`); botProcess = null; });
    botProcess.on("error", (err) => { console.error(`[api] error: ${err.message}`); botProcess = null; });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

