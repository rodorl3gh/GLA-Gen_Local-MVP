"use client";

import { useState, useEffect } from "react";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin_token");
    if (saved) setIsAuth(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("admin_token", data.token);
        setIsAuth(true);
      } else {
        setError("Credenciales invalidas");
      }
    } catch {
      setError("Error de conexion");
    }
    setLoading(false);
  };

  if (!isAuth) {
    return (
      <main className="flex h-screen items-center justify-center bg-[var(--brand-bg)]">
        <div className="w-full max-w-sm p-8 rounded-2xl bg-white border border-[var(--brand-border)] shadow-lg animate-scale-in">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[var(--brand-primary)] flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
              P
            </div>
            <h1 className="text-lg font-semibold text-[var(--brand-text)]">Punto de Venta</h1>
            <p className="text-xs text-[var(--brand-text-muted)] mt-1">Cafeteria Luna</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] text-[var(--brand-text-muted)] uppercase tracking-wider mb-1.5 block">Usuario</label>
              <input type="text" value={user} onChange={(e) => setUser(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50 focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-all" />
            </div>
            <div>
              <label className="text-[10px] text-[var(--brand-text-muted)] uppercase tracking-wider mb-1.5 block">Contrasena</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
                placeholder="Ingresa tu contrasena"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50 focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-all" />
            </div>
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-center">{error}</div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-[var(--brand-primary)] text-white text-sm rounded-xl hover:bg-[var(--brand-primary-dark)] disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all active:scale-[0.98]">
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
