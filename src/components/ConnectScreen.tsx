"use client";

import { useState } from "react";

interface Props {
  status: "disconnected" | "connecting";
  onConnect: () => void;
}

export default function ConnectScreen({ status, onConnect }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/connection/start", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Error al iniciar el bot");
      } else {
        onConnect();
      }
    } catch {
      setError("No se pudo iniciar. Verifica que el servidor este corriendo.");
    }
    setLoading(false);
  };

  return (
    <main className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 18c3.866 0 7-3.582 7-8s-3.134-8-7-8-7 3.582-7 8c0 1.75.494 3.373 1.344 4.688L4 20l4.125-1.125A6.95 6.95 0 0012 18z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">
          Agente WhatsApp — Luna
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-2">
          {status === "connecting"
            ? "Iniciando conexion con WhatsApp..."
            : "Conecta tu numero de WhatsApp para empezar a recibir y responder mensajes automaticamente."}
        </p>
        {status === "connecting" ? (
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
            <span className="text-sm text-emerald-400">Conectando...</span>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="mt-6 px-6 py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all font-medium shadow-lg shadow-emerald-500/20"
          >
            {loading ? "Iniciando..." : "Conectar WhatsApp"}
          </button>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
            {error}
          </p>
        )}
        <p className="mt-6 text-[11px] text-[var(--text-muted)]">
          Al conectar se generara un codigo QR para escanear con tu telefono.
        </p>
      </div>
    </main>
  );
}
