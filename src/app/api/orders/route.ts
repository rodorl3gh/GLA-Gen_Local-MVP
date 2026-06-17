import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const now = Math.floor(Date.now() / 1000);
  const twentyFourHoursAgo = now - 86400;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTs = Math.floor(todayStart.getTime() / 1000);

  // Auto-expire orders older than 24h that are still pending/preparing
  db.prepare(
    `UPDATE orders SET status = 'expirado' WHERE status IN ('pending','preparing') AND created_at < ?`
  ).run(twentyFourHoursAgo);

  let fromTs = todayStartTs;
  if (from) {
    const [fy, fm, fd] = from.split("-").map(Number);
    fromTs = Math.floor(new Date(fy, fm - 1, fd).getTime() / 1000);
  }

  let toTs = now;
  if (to) {
    const [ty, tm, td] = to.split("-").map(Number);
    toTs = Math.floor(new Date(ty, tm - 1, td, 23, 59, 59).getTime() / 1000);
  }

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

  const total = orders.length;
  const pendientes = orders.filter((o: any) => o.status === "pending").length;
  const ingresos = orders
    .filter((o: any) => o.status !== "cancelled")
    .reduce((s: number, o: any) => s + Number(o.total), 0);

  const hoy = orders.filter(
    (o: any) => new Date(o.created_at).getTime() / 1000 >= todayStartTs
  ).length;

  const ingresosHoy = orders
    .filter(
      (o: any) =>
        o.status !== "cancelled" &&
        new Date(o.created_at).getTime() / 1000 >= todayStartTs
    )
    .reduce((s: number, o: any) => s + Number(o.total), 0);

  const aprobados = orders.filter((o: any) => o.payment_status === "approved").length;
  const rechazados = orders.filter((o: any) => o.payment_status === "rejected").length;

  return NextResponse.json({
    orders,
    stats: { total, hoy, pendientes, ingresos_hoy: ingresosHoy, ingresos, aprobados, rechazados },
  });
}
