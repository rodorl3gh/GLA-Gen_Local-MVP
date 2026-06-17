"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/Sidebar";
import WhatsAppConnect from "@/components/admin/WhatsAppConnect";

export default function AdminSettings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState("0.4");
  const [burstDelay, setBurstDelay] = useState("12000");
  const [model, setModel] = useState("gpt-4o-mini");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/prompt").then(r => r.json()).then(d => setPrompt(d.prompt || "")).catch(() => {});
    fetch("/api/settings/agent").then(r => r.json()).then(d => {
      setTemperature(String(d.temperature ?? 0.4));
      setBurstDelay(String(d.burstDelayMs ?? 12000));
      setModel(d.openaiModel || "gpt-4o-mini");
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      await fetch("/api/settings/prompt", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      await fetch("/api/settings/agent", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temperature: parseFloat(temperature), burstDelayMs: parseInt(burstDelay), openaiModel: model }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {}
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
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[var(--admin-text)]">Ajustes</h1>
          <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">Configuración del negocio y el agente IA</p>
        </div>
        <div className="max-w-2xl space-y-6">

          {/* WhatsApp Connection */}
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-[var(--admin-text)]">Conexión WhatsApp</h2>
            </div>
            <WhatsAppConnect />
            <p className="text-[10px] text-[var(--admin-text-muted)] mt-3">
              Al conectar WhatsApp, los pedidos de los clientes llegarán como mensajes a este número.
              Las notificaciones de pedidos nuevos y cambios de estado se enviarán automáticamente.
            </p>
          </div>

          {/* Agent Settings */}
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-[var(--admin-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h2 className="text-sm font-semibold text-[var(--admin-text)]">Agente IA — System Prompt</h2>
            </div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={12}
              className="w-full px-4 py-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-xs text-[var(--admin-text)] font-mono focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20 resize-none transition-all" />
          </div>

          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] p-5 grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Temperatura</label>
              <input type="number" value={temperature} onChange={e => setTemperature(e.target.value)} step="0.1" min="0" max="2"
                className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20 transition-all" />
              <p className="text-[10px] text-[var(--admin-placeholder)] mt-1">Creatividad (0-2)</p>
            </div>
            <div>
              <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Delay Buffer</label>
              <input type="number" value={burstDelay} onChange={e => setBurstDelay(e.target.value)} step="1000" min="3000"
                className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20 transition-all" />
              <p className="text-[10px] text-[var(--admin-placeholder)] mt-1">Anti-ráfaga (ms)</p>
            </div>
            <div>
              <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Modelo</label>
              <select value={model} onChange={e => setModel(e.target.value)}
                className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-all">
                <option value="gpt-4o-mini">GPT-4o-mini</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
              <p className="text-[10px] text-[var(--admin-placeholder)] mt-1">Motor de IA</p>
            </div>
          </div>

          <button onClick={handleSave}
            className="px-6 py-2.5 bg-[var(--admin-accent)] text-white text-sm rounded-xl hover:bg-[var(--admin-accent-hover)] font-medium transition-all shadow-[0_2px_8px_rgba(192,122,91,0.2)] hover:shadow-[0_4px_16px_rgba(192,122,91,0.3)]">
            {saved ? "Guardado!" : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
