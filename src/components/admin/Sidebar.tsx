"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAdminTheme } from "@/lib/theme-context";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/admin/orders", label: "Pedidos", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01", badge: true },
  { href: "/admin/products", label: "Productos", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { href: "/admin/payments", label: "Pagos", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/admin/content", label: "Contenido", icon: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" },
];

export default function AdminSidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const { theme, toggleTheme } = useAdminTheme();

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        if (data.stats) setPendingCount(data.stats.pendientes);
      } catch {}
    };
    fetchPending();
    const i = setInterval(fetchPending, 10000);
    return () => clearInterval(i);
  }, []);

  return (
    <aside className={`w-60 border-r border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] flex flex-col shrink-0
      fixed inset-y-0 left-0 z-50 transition-transform duration-300
      md:relative md:translate-x-0
      ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      {/* Close button on mobile */}
      <button onClick={onClose}
        className="md:hidden absolute top-4 right-4 w-8 h-8 rounded-lg bg-[var(--admin-bg-tertiary)] flex items-center justify-center text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors z-10">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      <div className="p-5 border-b border-[var(--admin-border)]">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[var(--admin-accent)] flex items-center justify-center text-white font-bold text-sm shadow-[0_4px_12px_rgba(192,122,91,0.25)] group-hover:shadow-[0_4px_20px_rgba(192,122,91,0.4)] transition-shadow">
            L
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--admin-text)]">Luna</h1>
            <p className="text-[10px] text-[var(--admin-text-muted)]">Panel Admin</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                active
                  ? "bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] font-medium shadow-[inset_0_1px_0_rgba(192,122,91,0.1)]"
                  : "text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-tertiary)] hover:text-[var(--admin-text)]"
              }`}>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {item.label}
              {item.badge && pendingCount > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[var(--admin-border)] space-y-1">
        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-tertiary)] hover:text-[var(--admin-text-secondary)] transition-colors"
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
          {theme === "dark" ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
        </button>

        <a href="/pos"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-tertiary)] hover:text-[var(--admin-text-secondary)] transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
          Punto de Venta
        </a>

        <a href="/menu" target="_blank"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-tertiary)] hover:text-[var(--admin-text-secondary)] transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Ver Menu Digital
        </a>
        <button onClick={() => { localStorage.removeItem("admin_token"); window.location.reload(); }}
          className="w-full px-3 py-2 rounded-xl text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/8 transition-colors text-left">
          Cerrar Sesion
        </button>
      </div>
    </aside>
  );
}
