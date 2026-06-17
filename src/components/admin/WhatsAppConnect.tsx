"use client";

import { useEffect, useRef, useState } from "react";

export default function WhatsAppConnect() {
  const [status, setStatus] = useState<"disconnected" | "qr" | "connecting" | "connected">("disconnected");
  const [qrString, setQrString] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/connection/status");
        const data = await res.json();
        if (data) {
          setStatus(data.status);
          if (data.qrString) setQrString(data.qrString);
          if (data.phone) setPhone(data.phone);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!qrString || !canvasRef.current) return;
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvasRef.current, qrString, {
        width: 200,
        margin: 1,
        color: { dark: "#c07a5b", light: "#ffffff" },
      });
    });
  }, [qrString]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await fetch("/api/connection/start", { method: "POST" });
    } catch {}
    setLoading(false);
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/connection/disconnect", { method: "POST" });
      setQrString(null);
      setPhone(null);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">WhatsApp Bot</h3>
          <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
            {status === "connected" ? "Conectado y recibiendo pedidos" : "Conecta WhatsApp para recibir notificaciones de pedidos"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            status === "connected" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : status === "qr" ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" : status === "connecting" ? "bg-sky-400 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.5)]" : "bg-red-400"
          }`} />
          <span className="text-xs text-[var(--admin-text-secondary)] capitalize">{status === "qr" ? "Esperando QR" : status}</span>
        </div>
      </div>

      {status === "connected" && phone && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <span className="text-xs text-emerald-400">Conectado como <span className="font-mono font-medium">{phone}</span></span>
          <button onClick={handleDisconnect}
            className="px-3 py-1 text-[11px] bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">
            Desconectar
          </button>
        </div>
      )}

      {(status === "qr" || status === "disconnected") && (
        <div>
          {status === "qr" && qrString ? (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-2 rounded-xl inline-block shadow-lg">
                <canvas ref={canvasRef} />
              </div>
              <p className="text-[10px] text-[var(--admin-text-muted)] text-center">
                Escanea con WhatsApp → Dispositivos vinculados
              </p>
            </div>
          ) : (
            <button onClick={handleConnect} disabled={loading}
              className="w-full py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-medium transition-all">
              {loading ? "Iniciando..." : "Conectar WhatsApp"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
