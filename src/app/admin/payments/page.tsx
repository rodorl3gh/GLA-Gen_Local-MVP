"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/Sidebar";

interface PaymentMethod {
  id: number;
  name: string;
  enabled: number;
  details: string[];
}

export default function AdminPayments() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [newError, setNewError] = useState("");

  const fetchMethods = async () => {
    const res = await fetch("/api/payments");
    const d = await res.json();
    if (Array.isArray(d)) setMethods(d);
    setLoading(false);
  };

  useEffect(() => { fetchMethods().catch(() => setLoading(false)); }, []);

  const handleToggle = async (id: number, enabled: number) => {
    const newEnabled = enabled ? 0 : 1;
    await fetch("/api/payments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled: newEnabled }),
    });
    setMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: newEnabled } : m))
    );
  };

  const startEdit = (m: PaymentMethod) => {
    setEditId(m.id);
    setEditName(m.name);
    setEditDetails(m.details.join("\n"));
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
    setEditDetails("");
  };

  const saveEdit = async () => {
    if (!editId) return;
    const detailsArray = editDetails
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    await fetch("/api/payments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, name: editName.trim(), details: detailsArray }),
    });

    setMethods((prev) =>
      prev.map((m) =>
        m.id === editId ? { ...m, name: editName.trim(), details: detailsArray } : m
      )
    );
    cancelEdit();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCreate = async () => {
    if (!newName.trim()) { setNewError("Nombre requerido"); return; }
    setNewError("");
    const detailsArray = newDetails.split("\n").map(l => l.trim()).filter(Boolean);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), enabled: 1, details: detailsArray }),
    });
    const data = await res.json();
    if (data.success) {
      setShowNew(false);
      setNewName("");
      setNewDetails("");
      fetchMethods();
    } else {
      setNewError(data.error || "Error al crear");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[var(--admin-bg)]">
        <AdminSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}
        <main className="flex-1 flex items-center justify-center">
          <p className="text-xs text-[var(--admin-text-muted)] animate-pulse">Cargando...</p>
        </main>
      </div>
    );
  }

  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("efectivo")) return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
    if (n.includes("transferencia")) return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    );
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    );
  };

  return (
    <div className="flex h-screen bg-[var(--admin-bg)]">
      <AdminSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <button onClick={() => setSidebarOpen(true)}
          className="md:hidden mb-4 w-10 h-10 rounded-xl bg-[var(--admin-bg-secondary)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[var(--admin-text)]">Pasarelas de Pago</h1>
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">Configura los metodos de pago para los clientes</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2 bg-[var(--admin-accent)] text-white text-sm rounded-xl hover:bg-[var(--admin-accent-hover)] transition-all font-medium">
            + Nuevo Metodo
          </button>
        </div>

        <div className="max-w-2xl space-y-4">
          {methods.map((m) => (
            <div key={m.id}
              className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] p-5 transition-all">
              {editId === m.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Nombre del metodo</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Detalles (uno por linea)</label>
                    <textarea value={editDetails} onChange={(e) => setEditDetails(e.target.value)} rows={4}
                      className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] font-mono focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20 transition-all resize-none" />
                    <p className="text-[10px] text-[var(--admin-placeholder)] mt-1">Cada linea sera un dato (ej: Banco: BBVA, Cuenta: XXX)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={saveEdit} className="px-4 py-2 bg-[var(--admin-accent)] text-white text-xs rounded-xl hover:bg-[var(--admin-accent-hover)] font-medium transition-all">Guardar</button>
                    <button onClick={cancelEdit} className="px-4 py-2 border border-[var(--admin-border)] text-[var(--admin-text-secondary)] text-xs rounded-xl hover:bg-[var(--admin-bg-tertiary)] hover:text-[var(--admin-text)] transition-all">Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${m.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/5 text-red-400/40"}`}>
                        {getIcon(m.name)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--admin-text)]">{m.name}</h3>
                        <p className="text-[10px] text-[var(--admin-text-muted)]">{m.enabled ? "Activado" : "Desactivado"}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={m.enabled === 1} onChange={() => handleToggle(m.id, m.enabled)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--admin-border)] rounded-full peer peer-checked:bg-[var(--admin-accent)] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                    </label>
                  </div>

                  <div className="space-y-1 mb-4">
                    {m.details.map((d, i) => (
                      <p key={i} className="text-xs text-[var(--admin-text-secondary)] flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[var(--admin-placeholder)] shrink-0" />{d}
                      </p>
                    ))}
                    {m.details.length === 0 && (
                      <p className="text-xs text-[var(--admin-placeholder)] italic">Sin detalles configurados</p>
                    )}
                  </div>

                  <button onClick={() => startEdit(m)}
                    className="text-[10px] text-[var(--admin-text-muted)] hover:text-[var(--admin-accent)] transition-colors flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar datos
                  </button>
                </>
              )}
            </div>
          ))}

          {/* New method form */}
          {showNew && (
            <div className="rounded-2xl border border-[var(--admin-accent)]/30 bg-[var(--admin-bg-secondary)] p-5 animate-scale-in">
              <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-4">Nuevo Metodo de Pago</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Nombre *</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej: Mercado Pago, OXXO, Stripe..."
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Detalles (uno por linea)</label>
                  <textarea value={newDetails} onChange={(e) => setNewDetails(e.target.value)} rows={3}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] font-mono focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20 transition-all resize-none" />
                </div>
                {newError && <p className="text-red-400 text-xs">{newError}</p>}
                <div className="flex items-center gap-2">
                  <button onClick={handleCreate} className="px-4 py-2 bg-[var(--admin-accent)] text-white text-xs rounded-xl hover:bg-[var(--admin-accent-hover)] font-medium transition-all">Crear</button>
                  <button onClick={() => { setShowNew(false); setNewName(""); setNewDetails(""); setNewError(""); }}
                    className="px-4 py-2 border border-[var(--admin-border)] text-[var(--admin-text-secondary)] text-xs rounded-xl hover:bg-[var(--admin-bg-tertiary)] hover:text-[var(--admin-text)] transition-all">Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {saved && (
            <div className="fixed bottom-6 right-6 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl animate-fade-in">
              Cambios guardados correctamente
            </div>
          )}

          <div className="rounded-2xl border border-dashed border-[var(--admin-border)] p-5">
            <p className="text-[10px] text-[var(--admin-text-muted)] text-center">
              El agente IA usara automaticamente los datos configurados aqui para responder preguntas sobre pagos. Solo los metodos activados se mostraran a los clientes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
