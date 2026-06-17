import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const filtersStr = searchParams.get("filters") || "";

  const activeFilters = filtersStr ? filtersStr.split(",").map(f => f.trim()).filter(Boolean) : [];

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const fromTs = from ? Math.floor(new Date(from).getTime() / 1000) : now - 30 * 86400;
  const toTs = to ? Math.floor(new Date(to).getTime() / 1000) + 86400 : now;

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
    const hasCancelados = activeFilters.includes("cancelados");
    const hasTotal = activeFilters.includes("total");

    if (hasEntregados && !hasCancelados) {
      orders = orders.filter((o: any) => o.status === "delivered");
    } else if (!hasEntregados && hasCancelados) {
      orders = orders.filter((o: any) => o.status === "cancelled");
    } else if (!hasEntregados && !hasCancelados && !hasTotal) {
      orders = orders.filter((o: any) => o.status === "delivered" || o.status === "cancelled");
    }
    // if both or total is checked, include all
  } else {
    // Default: delivered + cancelled
    orders = orders.filter((o: any) => o.status === "delivered" || o.status === "cancelled");
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

  const statusLabel: Record<string, string> = { delivered: "Entregado", cancelled: "Cancelado" };
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
