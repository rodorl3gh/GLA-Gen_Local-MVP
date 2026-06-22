import { NextRequest, NextResponse } from "next/server";
import { getDb, cleanExpiredPendingOrders } from "@/lib/db";
import { getMexicoTodayStartTs } from "@/lib/mexico-timezone";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const now = Math.floor(Date.now() / 1000);
  const twentyFourHoursAgo = now - 86400;
  const todayStartTs = getMexicoTodayStartTs();

  // Clean expired pending orders (older than 1h)
  try { cleanExpiredPendingOrders(); } catch {}

  // Auto-expire orders older than 24h that are still pending/preparing
  // Try-catch: deployed DBs may lack 'expirado' in CHECK constraint
  try {
    db.prepare(
      `UPDATE orders SET status = 'expirado' WHERE status IN ('pending','preparing') AND created_at < ?`
    ).run(twentyFourHoursAgo);
  } catch {}

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
  const aprobados = orders.filter((o: any) => o.payment_status === "approved").length;
  const rechazados = orders.filter((o: any) => o.payment_status === "rejected").length;
  const ingresos = orders
    .filter((o: any) => o.payment_status === "approved")
    .reduce((s: number, o: any) => s + Number(o.total), 0);

  const hoy = orders.filter(
    (o: any) => new Date(o.created_at).getTime() / 1000 >= todayStartTs
  ).length;

  const ingresosHoy = orders
    .filter(
      (o: any) =>
        o.payment_status === "approved" &&
        new Date(o.created_at).getTime() / 1000 >= todayStartTs
    )
    .reduce((s: number, o: any) => s + Number(o.total), 0);

  return NextResponse.json({
    orders,
    stats: { total, hoy, pendientes, ingresos_hoy: ingresosHoy, ingresos, aprobados, rechazados },
  });
}
