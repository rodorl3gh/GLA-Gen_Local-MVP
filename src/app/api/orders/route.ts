import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Default: last 60 days
  const now = Math.floor(Date.now() / 1000);
  const fromTs = from ? Math.floor(new Date(from).getTime() / 1000) : now - 60 * 86400;
  const toTs = to ? Math.floor(new Date(to).getTime() / 1000) + 86400 : now;

  const orders = db
    .prepare(
      `SELECT * FROM orders WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC`
    )
    .all(fromTs, toTs)
    .map((o: any) => ({
      ...o,
      items: JSON.parse(o.items || "[]"),
      created_at: new Date(o.created_at * 1000).toISOString(),
    }));

  // Stats for filtered range
  const total = orders.length;
  const pendientes = orders.filter((o: any) => o.status === "pending").length;
  const ingresos = orders
    .filter((o: any) => o.status !== "cancelled")
    .reduce((s: number, o: any) => s + Number(o.total), 0);

  // Hoy: count only today's orders
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = Math.floor(todayStart.getTime() / 1000);
  const hoy = orders.filter(
    (o: any) => new Date(o.created_at).getTime() / 1000 >= todayTs
  ).length;

  const ingresosHoy = orders
    .filter(
      (o: any) =>
        o.status !== "cancelled" &&
        new Date(o.created_at).getTime() / 1000 >= todayTs
    )
    .reduce((s: number, o: any) => s + Number(o.total), 0);

  return NextResponse.json({
    orders,
    stats: { total, hoy, pendientes, ingresos_hoy: ingresosHoy },
  });
}
