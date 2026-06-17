import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const fromTs = from ? Math.floor(new Date(from).getTime() / 1000) : now - 60 * 86400;
  const toTs = to ? Math.floor(new Date(to).getTime() / 1000) + 86400 : now;

  const orders = db
    .prepare(
      `SELECT * FROM orders WHERE created_at >= ? AND created_at <= ? AND status IN ('delivered','cancelled') ORDER BY created_at ASC`
    )
    .all(fromTs, toTs)
    .map((o: any) => ({
      ...o,
      items: JSON.parse(o.items || "[]"),
    }));

  const statusLabel: Record<string, string> = {
    delivered: "Entregado",
    cancelled: "Cancelado",
  };

  // Build CSV
  const BOM = "\uFEFF";
  const header = "ID,Fecha,Cliente,Productos,Total,Estado,Pago,Notas";
  const rows = orders.map((o: any) => {
    const date = new Date(o.created_at * 1000).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const products = o.items
      .map((i: any) => `${i.name} x${i.quantity}`)
      .join("; ");
    const phone = (o.phone || "").replace(/"/g, '""');
    const notes = (o.notes || "").replace(/"/g, '""');
    const total = Number(o.total).toFixed(2);
    const status = statusLabel[o.status] || o.status;

    return `"${o.id}","${date}","${phone}","${products}","${total}","${status}","${o.payment_method || ""}","${notes}"`;
  });

  const csv = BOM + header + "\n" + rows.join("\n");
  const filename = `reporte-pedidos-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
