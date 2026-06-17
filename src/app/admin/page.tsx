"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/Sidebar";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, hoy: 0, pendientes: 0, ingresos_hoy: 0 });
  const [catalogCount, setCatalogCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/orders").then(r => r.json()).then(d => {
      if (d.stats) setStats(d.stats);
      if (d.orders) setRecentOrders(d.orders.slice(0, 5));
    }).catch(() => {});
    fetch("/api/catalog").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setCatalogCount(d.length);
    }).catch(() => {});
  }, []);

  const cards = [
    {
      label: "Pedidos Hoy",
      value: stats.hoy,
      color: "text-[var(--admin-accent)]",
      bg: "bg-[var(--admin-accent)]/10",
      border: "border-[var(--admin-accent)]/25",
      glow: "shadow-[0_4px_16px_rgba(192,122,91,0.1)]",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    },
    {
      label: "Pendientes",
      value: stats.pendientes,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/25",
      glow: "shadow-[0_4px_16px_rgba(245,158,11,0.1)]",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      label: "Productos",
      value: catalogCount,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      border: "border-sky-500/25",
      glow: "shadow-[0_4px_16px_rgba(14,165,233,0.1)]",
      icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    },
    {
      label: "Ingresos Hoy",
      value: `$${(stats.ingresos_hoy || 0).toFixed(0)}`,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/25",
      glow: "shadow-[0_4px_16px_rgba(16,185,129,0.1)]",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
  ];

  const linkCards = [
    { href: "/admin/orders", label: "Ver Pedidos", desc: "Gestiona pedidos entrantes", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
    { href: "/admin/products", label: "Gestionar Productos", desc: "Agrega o edita el menu", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
    { href: "/admin/payments", label: "Pasarelas de Pago", desc: "Configura metodos de pago", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { href: "/admin/content", label: "Crear Contenido", desc: "Genera publicaciones con IA", icon: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" },
  ];

  return (
    <div className="flex h-screen bg-[var(--admin-bg)]">
      <AdminSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Mobile hamburger */}
        <button onClick={() => setSidebarOpen(true)}
          className="md:hidden mb-4 w-10 h-10 rounded-xl bg-[var(--admin-bg-secondary)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[var(--admin-text)]">Dashboard</h1>
          <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">Resumen general de tu negocio</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
          {cards.map(c => (
            <div key={c.label} className={`p-5 rounded-2xl border ${c.border} ${c.bg} ${c.glow} animate-fade-up`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">{c.label}</p>
                <svg className={`w-4 h-4 ${c.color} opacity-60`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={c.icon} />
                </svg>
              </div>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Recent orders + Quick actions */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--admin-text)]">Pedidos Recientes</h2>
              <a href="/admin/orders" className="text-[10px] text-[var(--admin-text-muted)] hover:text-[var(--admin-accent)] transition-colors">
                Ver todos →
              </a>
            </div>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-[var(--admin-text-muted)]">Aún no hay pedidos registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((o: any) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-amber-500/15 text-amber-400",
                    preparing: "bg-sky-500/15 text-sky-400",
                    delivered: "bg-emerald-500/15 text-emerald-400",
                    cancelled: "bg-red-500/15 text-red-400",
                  };
                  return (
                    <a key={o.id} href="/admin/orders"
                      className="flex items-center justify-between p-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] hover:border-[var(--admin-accent)]/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-[var(--admin-text)] font-medium">#{o.id}</span>
                        <span className="text-xs text-[var(--admin-text-secondary)] line-clamp-1 max-w-[200px]">
                          {o.items?.map((i: any) => `${i.name} x${i.quantity}`).join(", ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-[var(--admin-accent)]">${Number(o.total).toFixed(0)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[o.status] || "bg-gray-500/15 text-gray-400"}`}>
                          {o.status === "pending" ? "Pendiente" : o.status === "preparing" ? "Preparando" : o.status === "delivered" ? "Entregado" : o.status}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] p-5">
            <h2 className="text-sm font-semibold text-[var(--admin-text)] mb-4">Acceso Rápido</h2>
            <div className="space-y-2">
              {linkCards.map(l => (
                <a key={l.href} href={l.href}
                  className="flex items-start gap-3 p-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] hover:border-[var(--admin-accent)]/30 hover:bg-[var(--admin-bg-hover)] transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-[var(--admin-accent)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--admin-accent)]/20 transition-colors">
                    <svg className="w-4 h-4 text-[var(--admin-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={l.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--admin-text)] group-hover:text-[var(--admin-accent)] transition-colors">{l.label}</p>
                    <p className="text-[10px] text-[var(--admin-text-muted)]">{l.desc}</p>
                  </div>
                </a>
              ))}
            </div>
            <a href="/menu" target="_blank"
              className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)] hover:border-[var(--admin-accent)]/30 hover:text-[var(--admin-accent)] transition-all">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver Menú Digital
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
