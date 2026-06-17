import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto
    .createHash("sha256")
    .update("gla-negocio-local-test_salt_" + password)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { user, pass } = await req.json();
    const adminUser = process.env.ADMIN_USER || "admin";
    const adminPassHash = process.env.ADMIN_PASS_HASH || hashPassword("Password123*");

    if (!user || !pass)
      return NextResponse.json({ success: false, error: "Usuario y contrasena requeridos" }, { status: 400 });

    if (user !== adminUser || hashPassword(pass) !== adminPassHash) {
      return NextResponse.json({ success: false, error: "Credenciales invalidas" }, { status: 401 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    return NextResponse.json({ success: true, token });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || token.length < 32)
    return NextResponse.json({ admin: false });
  return NextResponse.json({ admin: true });
}

