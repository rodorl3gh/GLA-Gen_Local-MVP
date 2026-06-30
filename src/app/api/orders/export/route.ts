import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { dateToMexicoTs } from "@/lib/mexico-timezone";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const filtersStr = searchParams.get("filters") || "";

  const activeFilters = filtersStr ? filtersStr.split(",").map(f => f.trim()).filter(Boolean) : [];

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  let fromTs = now - 30 * 86400;
  if (from) {
    fromTs = dateToMexicoTs(from, false);
  }

  let toTs = now;
  if (to) {
    toTs = dateToMexicoTs(to, true);
  }

  let orders = db
    .prepare(`SELECT * FROM orders WHERE created_at >= ? AND created_at <= ? ORDER BY created_at ASC`)
    .all(fromTs, toTs)
    .map((o: any) => ({
      ...o,
      items: JSON.parse(o.items || "[]"),
    }));

  // Apply status filters
  if (activeFilters.length > 0) {
    const hasEntregados = activeFilters.includes("entregados");
    const hasExpirados = activeFilters.includes("expirados");
    const hasCancelados = activeFilters.includes("cancelados");
    const hasTotal = activeFilters.includes("total");

    const statuses: string[] = [];
    if (hasEntregados || hasTotal) statuses.push("delivered");
    if (hasExpirados || hasTotal) statuses.push("expirado");
    if (hasCancelados || hasTotal) statuses.push("cancelled");

    if (statuses.length > 0) {
      const placeholders = statuses.map(() => "?").join(",");
      orders = orders.filter((o: any) => statuses.includes(o.status));
    }
  } else {
    orders = orders.filter((o: any) => o.status === "delivered" || o.status === "expirado" || o.status === "cancelled");
  }

  // Apply payment type filters
  if (activeFilters.length > 0) {
    const paymentFilters = ["efectivo", "tarjeta", "transferencia", "paypal"];
    const activePaymentFilters = paymentFilters.filter(f => activeFilters.includes(f));
    if (activePaymentFilters.length > 0) {
      orders = orders.filter((o: any) => {
        const pm = (o.payment_method || "").toLowerCase();
        return activePaymentFilters.some(f => pm.includes(f));
      });
    }
  }

  const showNombre = activeFilters.includes("nombre");
  const showNumero = activeFilters.includes("numero");
  const showNotas = activeFilters.includes("notas");

  const statusLabel: Record<string, string> = { delivered: "Entregado", cancelled: "Cancelado", expirado: "Expirado" };
  const BOM = "\uFEFF";

  // Build header dynamically
  const headerParts = ["ID", "Fecha"];
  if (showNombre) headerParts.push("Cliente");
  if (showNumero) headerParts.push("Telefono");
  headerParts.push("Productos", "Total", "Estado", "Pago");
  if (showNotas) headerParts.push("Notas");

  const rows = orders.map((o: any) => {
    const date = new Date(o.created_at * 1000).toLocaleString("es-MX", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const products = o.items.map((i: any) => `${i.name} x${i.quantity}`).join("; ");
    const phone = (o.phone || "").split(" - ").pop() || "";
    const name = (o.phone || "").split(" - ")[0] || "";
    const notes = (o.notes || "").replace(/"/g, '""');
    const total = Number(o.total).toFixed(2);
    const status = statusLabel[o.status] || o.status;

    const rowParts = [`"${o.id}"`, `"${date}"`];
    if (showNombre) rowParts.push(`"${name.replace(/"/g, '""')}"`);
    if (showNumero) rowParts.push(`"${phone.replace(/"/g, '""')}"`);
    rowParts.push(`"${products}"`, `"${total}"`, `"${status}"`, `"${o.payment_method || ""}"`);
    if (showNotas) rowParts.push(`"${notes}"`);

    return rowParts.join(",");
  });

  const csv = BOM + headerParts.join(",") + "\n" + rows.join("\n");
  const filename = `reporte-pedidos-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
