"use client";

import { useState, useEffect, useCallback } from "react";
import AdminSidebar from "@/components/admin/Sidebar";

type ViewMode = "list" | "kanban";

const STATUS: Record<string, { label: string; cls: string; icon: string }> = {
  pending:    { label: "Pendiente", cls: "bg-amber-200 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border-amber-300 dark:border-amber-500/30", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  preparing:  { label: "Preparando", cls: "bg-sky-200 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400 border-sky-300 dark:border-sky-500/30", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  delivered:  { label: "Entregado", cls: "bg-emerald-200 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30", icon: "M5 13l4 4L19 7" },
  expirado:   { label: "Expirado", cls: "bg-gray-300 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400 border-gray-400 dark:border-gray-500/30", icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  cancelled:  { label: "Cancelado", cls: "bg-red-200 text-red-800 dark:bg-red-500/20 dark:text-red-400 border-red-300 dark:border-red-500/30", icon: "M6 18L18 6M6 6l12 12" },
};

const PAYMENT_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pago Pendiente", cls: "bg-amber-200 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400 border-amber-300 dark:border-amber-500/20" },
  approved:  { label: "Pago Aprobado", cls: "bg-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/20" },
  rejected:  { label: "Pago Rechazado", cls: "bg-red-200 text-red-800 dark:bg-red-500/15 dark:text-red-400 border-red-300 dark:border-red-500/20" },
  refunded:  { label: "Reembolsado", cls: "bg-purple-200 text-purple-800 dark:bg-purple-500/15 dark:text-purple-400 border-purple-300 dark:border-purple-500/20" },
};

const STATUS_ORDER = ["pending", "preparing", "delivered", "expirado", "cancelled"];

function timeAgo(isoString: string): string {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return new Date(isoString).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function formatDate(isoString: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function toLocalDate(isoString: string): string {
  try { return new Date(isoString).toISOString().split("T")[0]; } catch { return ""; }
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, hoy: 0, pendientes: 0, ingresos_hoy: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [draggedOrderId, setDraggedOrderId] = useState<number | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  // Report modal state
  const [showReport, setShowReport] = useState(false);
  const oneMonthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const [reportFrom, setReportFrom] = useState(oneMonthAgo);
  const [reportTo, setReportTo] = useState(today);
  const [reportFilters, setReportFilters] = useState({
    total: true,
    entregados: true,
    expirados: true,
    cancelados: true,
    efectivo: true,
    tarjeta: true,
    transferencia: true,
    paypal: true,
    nombre: true,
    numero: true,
    notas: true,
  });

  const fetchOrders = useCallback(async (from?: string, to?: string) => {
    try {
      const params = new URLSearchParams();
      const f = from ?? dateFrom;
      const t = to ?? dateTo;
      if (f) params.set("from", f);
      if (t) params.set("to", t);
      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
      if (data.stats) setStats(data.stats);
    } catch {}
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchOrders(); const i = setInterval(() => fetchOrders(), 8000); return () => clearInterval(i); }, [fetchOrders]);

  const handleFilter = () => fetchOrders();

  const handleExport = () => {
    const filters: string[] = [];
    if (reportFilters.total) filters.push("total");
    if (reportFilters.entregados) filters.push("entregados");
    if (reportFilters.expirados) filters.push("expirados");
    if (reportFilters.cancelados) filters.push("cancelados");
    if (reportFilters.efectivo) filters.push("efectivo");
    if (reportFilters.tarjeta) filters.push("tarjeta");
    if (reportFilters.transferencia) filters.push("transferencia");
    if (reportFilters.paypal) filters.push("paypal");
    if (reportFilters.nombre) filters.push("nombre");
    if (reportFilters.numero) filters.push("numero");
    if (reportFilters.notas) filters.push("notas");

    const params = new URLSearchParams();
    if (reportFrom) params.set("from", reportFrom);
    if (reportTo) params.set("to", reportTo);
    if (filters.length > 0) params.set("filters", filters.join(","));
    window.open(`/api/orders/export?${params.toString()}`, "_blank");
    setShowReport(false);
  };

  const changeStatus = async (orderId: number, status: string) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
    if (selected?.id === orderId) setSelected((prev: any) => prev ? { ...prev, status } : null);
  };

  const changePaymentStatus = async (orderId: number, paymentStatus: string) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, payment_status: paymentStatus } : o));
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: paymentStatus }),
    });
    fetchOrders();
    if (selected?.id === orderId) setSelected((prev: any) => prev ? { ...prev, payment_status: paymentStatus } : null);
  };

  const handleDragStart = (e: React.DragEvent, orderId: number) => {
    setDraggedOrderId(orderId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(orderId));
    (e.currentTarget as HTMLElement).style.opacity = "0.4";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedOrderId(null);
    setDragOverStatus(null);
    (e.currentTarget as HTMLElement).style.opacity = "1";
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStatus !== status) setDragOverStatus(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !(e.currentTarget as HTMLElement).contains(related)) {
      setDragOverStatus(null);
    }
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverStatus(null);
    const orderIdRaw = e.dataTransfer.getData("text/plain");
    const orderId = parseInt(orderIdRaw);
    if (!orderId || isNaN(orderId)) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === newStatus) return;
    changeStatus(orderId, newStatus);
  };

  const sortedOrders = [...orders].sort((a, b) => {
    const ia = STATUS_ORDER.indexOf(a.status);
    const ib = STATUS_ORDER.indexOf(b.status);
    if (ia !== ib) return ia - ib;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const statCards = [
    { label: "Total Pedidos", value: stats.total, color: "text-[var(--admin-accent)]", bg: "bg-[var(--admin-accent)]/6", border: "border-[var(--admin-accent)]/20" },
    { label: "Hoy", value: stats.hoy, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/[0.06]", border: "border-emerald-300 dark:border-emerald-500/20" },
    { label: "Pendientes", value: stats.pendientes, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/[0.06]", border: "border-amber-300 dark:border-amber-500/20" },
    { label: "Ingresos Hoy", value: `$${(stats.ingresos_hoy || 0).toFixed(0)}`, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-500/[0.06]", border: "border-sky-300 dark:border-sky-500/20" },
  ];

  const renderListRow = (o: any) => {
    const s = STATUS[o.status] || STATUS.pending;
    const ps = PAYMENT_STATUS[o.payment_status] || null;
    const isCard = o.payment_method === "Tarjeta";
    return (
      <div key={o.id} onClick={() => setSelected(o)}
        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
          selected?.id === o.id
            ? "border-[var(--admin-accent)]/50 bg-[var(--admin-accent)]/5"
            : "border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] hover:border-[var(--admin-accent)]/30 hover:bg-[var(--admin-bg-hover)]"
        }`}>
        <span className="text-sm font-mono text-[var(--admin-text)] font-medium w-16 shrink-0">#{o.id}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--admin-text-secondary)] line-clamp-1">{o.items?.map((i: any) => `${i.name} x${i.quantity}`).join(", ")}</p>
          {o.payment_method && (
            <p className="text-[10px] text-[var(--admin-text-muted)] mt-0.5">{o.payment_method}</p>
          )}
        </div>
        <span className="text-xs text-[var(--admin-text-muted)] flex items-center gap-1 shrink-0">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {o.phone || "\u2014"}
        </span>
        <div onClick={(e) => e.stopPropagation()} className="shrink-0" style={{ width: "90px" }}>
          <select
            value={o.status}
            onChange={(e) => changeStatus(o.id, e.target.value)}
            className={`text-[10px] px-2 py-1 w-full rounded-full border font-medium cursor-pointer appearance-none text-center ${s.cls}`}>
            {["pending","preparing","delivered","cancelled"].map(st => (
              <option key={st} value={st}>{(STATUS as any)[st]?.label || st}</option>
            ))}
          </select>
        </div>
        {isCard ? (
          ps ? <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${ps.cls}`}>{ps.label}</span> : null
        ) : (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0" style={{ width: "100px" }}>
            <select
              value={o.payment_status || "pending"}
              onChange={(e) => changePaymentStatus(o.id, e.target.value)}
              className={`text-[10px] px-2 py-1 w-full rounded-full border font-medium cursor-pointer appearance-none text-center ${
                (PAYMENT_STATUS as any)[o.payment_status || "pending"]?.cls || ""
              }`}>
              <option value="pending">Pago Pendiente</option>
              <option value="approved">Pago Aprobado</option>
              <option value="rejected">Pago Rechazado</option>
            </select>
          </div>
        )}
        <span className="text-sm font-semibold text-[var(--admin-accent)] shrink-0 w-16 text-right">${Number(o.total).toFixed(0)}</span>
        <span className="text-[10px] text-[var(--admin-text-muted)] shrink-0 w-20 text-right">{timeAgo(o.created_at)}</span>
      </div>
    );
  };

  const renderKanbanCard = (o: any) => {
    const ps = PAYMENT_STATUS[o.payment_status] || null;
    return (
      <div key={o.id} onClick={() => setSelected(o)}
        draggable
        onDragStart={(e) => handleDragStart(e, o.id)}
        onDragEnd={handleDragEnd}
        className={`rounded-xl border p-3 cursor-pointer transition-all duration-200 ${
          draggedOrderId === o.id ? "opacity-40 scale-95" : ""
        } ${
          selected?.id === o.id
            ? "border-[var(--admin-accent)]/50 bg-[var(--admin-accent)]/5"
            : "border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] hover:border-[var(--admin-accent)]/30 hover:bg-[var(--admin-bg-hover)]"
        }`}>
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-mono text-[var(--admin-text)] font-medium">#{o.id}</span>
          <span className="text-xs font-bold text-[var(--admin-accent)]">${Number(o.total).toFixed(0)}</span>
        </div>
        <div className="space-y-1 mb-2">
          {o.items?.map((i: any, idx: number) => (
            <p key={idx} className="text-[11px] text-[var(--admin-text-secondary)]">
              <span className="text-[var(--admin-text-muted)]">{i.quantity}x</span> {i.name}
            </p>
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--admin-text-muted)] mb-1.5">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {o.phone || "\u2014"}
          </span>
          <span>{timeAgo(o.created_at)}</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {o.payment_method && (
            <span className="text-[9px] text-[var(--admin-text-muted)] bg-[var(--admin-bg)] px-1.5 py-0.5 rounded">{o.payment_method}</span>
          )}
          {ps && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${ps.cls}`}>{ps.label}</span>
          )}
        </div>
      </div>
    );
  };

  const toggleFilter = (key: keyof typeof reportFilters) => {
    setReportFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex h-screen bg-[var(--admin-bg)]">
      <AdminSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <button onClick={() => setSidebarOpen(true)}
          className="md:hidden mb-4 w-10 h-10 rounded-xl bg-[var(--admin-bg-secondary)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[var(--admin-text)]">Pedidos</h1>
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
              {orders.length} pedidos &middot; actualizacion cada 8s
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setShowReport(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-semibold">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generar Reporte
            </button>

            <div className="flex bg-[var(--admin-bg-secondary)] border border-[var(--admin-border)] rounded-xl p-1">
              <button onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 text-[11px] rounded-lg transition-all ${viewMode === "list" ? "bg-[var(--admin-accent)] text-white font-medium" : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]"}`}>
                Lista
              </button>
              <button onClick={() => setViewMode("kanban")}
                className={`px-3 py-1.5 text-[11px] rounded-lg transition-all ${viewMode === "kanban" ? "bg-[var(--admin-accent)] text-white font-medium" : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]"}`}>
                Kanban
              </button>
            </div>
          </div>
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-3 mb-4 p-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)]">
          <svg className="w-4 h-4 text-[var(--admin-accent)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider shrink-0">Desde</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} max={dateTo}
            className="px-3 py-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-all" />
          <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider shrink-0">Hasta</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} min={dateFrom} max={today}
            className="px-3 py-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-all" />
          <button onClick={handleFilter}
            className="px-4 py-1.5 bg-[var(--admin-accent)] text-white text-xs rounded-lg hover:bg-[var(--admin-accent-hover)] font-medium transition-all">
            Filtrar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {statCards.map(c => (
            <div key={c.label} className={`p-4 rounded-2xl border ${c.border} ${c.bg}`}>
              <p className="text-[10px] font-semibold text-[var(--admin-text)] uppercase tracking-wider mb-1">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Orders content */}
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            {viewMode === "list" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-4 px-4 py-2 text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">
                  <span className="w-16 shrink-0">#ID</span>
                  <span className="flex-1">Productos</span>
                  <span className="shrink-0 w-20">Tel</span>
                  <span className="shrink-0 text-center" style={{ width: "90px" }}>Estado</span>
                  <span className="shrink-0 text-center" style={{ width: "100px" }}>Pago</span>
                  <span className="shrink-0 w-16 text-right">Total</span>
                  <span className="shrink-0 w-20 text-right">Tiempo</span>
                </div>
                {sortedOrders.map(o => renderListRow(o))}
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {STATUS_ORDER.map(status => {
                  const st = STATUS[status];
                  const cols = sortedOrders.filter(o => o.status === status);
                  return (
                    <div key={status} className="space-y-2">
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-medium ${st.cls}`}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={st.icon} />
                        </svg>
                        <span className="text-[11px]">{st.label}</span>
                        <span className="text-[10px] opacity-60 ml-auto">{cols.length}</span>
                      </div>
                      <div
                        onDragOver={(e) => handleDragOver(e, status)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, status)}
                        className={`space-y-2 min-h-[120px] rounded-xl transition-all duration-200 p-1 ${
                          dragOverStatus === status
                            ? "bg-[var(--admin-accent)]/8 border-2 border-dashed border-[var(--admin-accent)]/50"
                            : "border-2 border-dashed border-transparent"
                        }`}
                      >
                        {cols.map(o => renderKanbanCard(o))}
                        {cols.length === 0 && dragOverStatus !== status && (
                          <p className="text-[10px] text-[var(--admin-placeholder)] text-center py-6">Sin pedidos</p>
                        )}
                        {cols.length === 0 && dragOverStatus === status && (
                          <p className="text-[10px] text-[var(--admin-accent)] text-center py-6 font-medium">Soltar aqui</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {sortedOrders.length === 0 && (
              <div className="text-center py-16 text-[var(--admin-text-muted)]">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm">No hay pedidos en este periodo</p>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-80 shrink-0 animate-fade-up">
              <div className="sticky top-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] overflow-hidden">
                <div className="p-5 border-b border-[var(--admin-border)] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--admin-text)]">Pedido #{selected.id}</h3>
                    <p className="text-[10px] text-[var(--admin-text-muted)]">{formatDate(selected.created_at)}</p>
                  </div>
                  <button onClick={() => setSelected(null)}
                    className="p-1.5 rounded-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-tertiary)] transition-all">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="p-3 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                    <p className="text-[var(--admin-text-muted)] text-[10px] uppercase mb-1 font-semibold">Cliente</p>
                    <p className="text-[var(--admin-text)] font-medium text-sm">{selected.phone || "Sin telefono"}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                    <p className="text-[var(--admin-text-muted)] text-[10px] uppercase mb-1 font-semibold">Fecha y Hora</p>
                    <p className="text-[var(--admin-text)] text-sm">{formatDate(selected.created_at)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-[var(--admin-text-muted)] uppercase mb-2 font-semibold">Productos</p>
                    <div className="space-y-1.5">
                      {selected.items?.map((i: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-1.5 px-3 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[var(--admin-text-muted)] bg-[var(--admin-bg-tertiary)] px-1.5 py-0.5 rounded font-medium">{i.quantity}x</span>
                            <span className="text-sm text-[var(--admin-text)]">{i.name}</span>
                          </div>
                          <span className="text-xs text-[var(--admin-text-secondary)]">${(Number(i.price) * i.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[var(--admin-border)] pt-3 flex justify-between">
                    <span className="text-sm font-semibold text-[var(--admin-text)]">Total</span>
                    <span className="text-sm font-bold text-[var(--admin-accent)]">${Number(selected.total).toFixed(0)}</span>
                  </div>

                  {selected.mp_payment_id && (
                    <div className="p-3 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                      <p className="text-[10px] text-[var(--admin-text-muted)] uppercase mb-1 font-semibold">Pago Mercado Pago</p>
                      <p className="text-[11px] text-[var(--admin-text-secondary)] font-mono">{selected.mp_payment_id}</p>
                      {selected.payment_status && PAYMENT_STATUS[selected.payment_status] && (
                        <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full border font-medium ${PAYMENT_STATUS[selected.payment_status].cls}`}>
                          {PAYMENT_STATUS[selected.payment_status].label}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="border-t border-[var(--admin-border)] pt-3">
                    <p className="text-[10px] text-[var(--admin-text-muted)] uppercase mb-3 font-semibold">Cambiar estado</p>
                    <div className="space-y-1.5">
                      {STATUS_ORDER.map(s => {
                        const st = STATUS[s];
                        const isActive = selected.status === s;
                        return (
                          <button key={s} onClick={() => changeStatus(selected.id, s)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                              isActive ? `${st.cls} border-current shadow-sm` : "border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:border-[var(--admin-border-hover)]"
                            }`}>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={st.icon} />
                            </svg>
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selected.notes && (
                    <div className="p-3 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                      <p className="text-[10px] text-[var(--admin-text-muted)] uppercase mb-1 font-semibold">Notas</p>
                      <p className="text-xs text-[var(--admin-text-secondary)]">{selected.notes}</p>
                    </div>
                  )}

                  <div className="border-t border-[var(--admin-border)] pt-3">
                    <p className="text-[10px] text-[var(--admin-text-muted)] uppercase mb-3 font-semibold">Estado del pago</p>
                    {selected.payment_method === "Tarjeta" ? (
                      <div className="p-3 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                        <p className="text-[10px] text-[var(--admin-text-muted)] mb-1">Gestionado por Mercado Pago (webhook)</p>
                        {PAYMENT_STATUS[selected.payment_status] && (
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium ${PAYMENT_STATUS[selected.payment_status].cls}`}>
                            {PAYMENT_STATUS[selected.payment_status].label}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {(["pending", "approved", "rejected"] as const).map(ps => {
                          const info = PAYMENT_STATUS[ps];
                          const isActive = (selected.payment_status || "pending") === ps;
                          return (
                            <button key={ps} onClick={() => changePaymentStatus(selected.id, ps)}
                              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                                isActive ? `${info.cls} border-current shadow-sm` : "border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:border-[var(--admin-border-hover)]"
                              }`}>
                              <span className={`w-2 h-2 rounded-full ${ps === "approved" ? "bg-emerald-500" : ps === "rejected" ? "bg-red-500" : "bg-amber-500"}`} />
                              {info.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReport && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowReport(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--admin-bg)] rounded-2xl w-full max-w-lg shadow-2xl border border-[var(--admin-border)] overflow-hidden animate-scale-in">
              <div className="p-5 border-b border-[var(--admin-border)] flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--admin-text)]">Generar Reporte</h2>
                <button onClick={() => setShowReport(false)} className="p-1.5 rounded-xl hover:bg-[var(--admin-bg-hover)]">
                  <svg className="w-5 h-5 text-[var(--admin-text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Date range */}
                <div>
                  <p className="text-[10px] text-[var(--admin-text-muted)] uppercase mb-2 font-semibold">Rango de fechas</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-[var(--admin-text-muted)]">Desde</label>
                      <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} max={reportTo}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-all" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-[var(--admin-text-muted)]">Hasta</label>
                      <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} min={reportFrom} max={today}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Order filters */}
                <div>
                  <p className="text-[10px] text-[var(--admin-text-muted)] uppercase mb-2 font-semibold">Tipos de pedido</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "total", label: "Pedidos Totales" },
                      { key: "entregados", label: "Entregados" },
                      { key: "expirados", label: "Expirados" },
                      { key: "cancelados", label: "Cancelados" },
                    ].map(f => (
                      <label key={f.key} className="flex items-center gap-2 py-2 px-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] cursor-pointer hover:border-[var(--admin-accent)]/30 transition-all">
                        <input type="checkbox" checked={(reportFilters as any)[f.key]} onChange={() => toggleFilter(f.key as any)}
                          className="w-3.5 h-3.5 rounded accent-[var(--admin-accent)]" />
                        <span className="text-[11px] text-[var(--admin-text)]">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Payment type filters */}
                <div>
                  <p className="text-[10px] text-[var(--admin-text-muted)] uppercase mb-2 font-semibold">Tipos de pago</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: "efectivo", label: "Efectivo" },
                      { key: "tarjeta", label: "Tarjeta" },
                      { key: "transferencia", label: "Transferencia" },
                      { key: "paypal", label: "PayPal" },
                    ].map(f => (
                      <label key={f.key} className="flex items-center gap-2 py-2 px-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] cursor-pointer hover:border-[var(--admin-accent)]/30 transition-all">
                        <input type="checkbox" checked={(reportFilters as any)[f.key]} onChange={() => toggleFilter(f.key as any)}
                          className="w-3.5 h-3.5 rounded accent-[var(--admin-accent)]" />
                        <span className="text-[11px] text-[var(--admin-text)]">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Client data filters */}
                <div>
                  <p className="text-[10px] text-[var(--admin-text-muted)] uppercase mb-2 font-semibold">Datos del cliente</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "nombre", label: "Nombre" },
                      { key: "numero", label: "Numero" },
                      { key: "notas", label: "Notas" },
                    ].map(f => (
                      <label key={f.key} className="flex items-center gap-2 py-2 px-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] cursor-pointer hover:border-[var(--admin-accent)]/30 transition-all">
                        <input type="checkbox" checked={(reportFilters as any)[f.key]} onChange={() => toggleFilter(f.key as any)}
                          className="w-3.5 h-3.5 rounded accent-[var(--admin-accent)]" />
                        <span className="text-[11px] text-[var(--admin-text)]">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-[var(--admin-border)] flex gap-3">
                <button onClick={() => setShowReport(false)}
                  className="flex-1 py-2.5 border border-[var(--admin-border)] text-sm text-[var(--admin-text-secondary)] rounded-xl hover:bg-[var(--admin-bg-hover)] transition-all font-medium">
                  Cancelar
                </button>
                <button onClick={handleExport}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-xl font-semibold flex items-center justify-center gap-2 transition-all">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar Excel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
