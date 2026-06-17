"use client";

import { useEffect, useRef } from "react";

interface Props {
  qrString: string;
}

export default function QRDisplay({ qrString }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!qrString || !canvasRef.current) return;

    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvasRef.current, qrString, {
        width: 300,
        margin: 2,
        color: { dark: "#10b981", light: "#060608" },
      });
    });
  }, [qrString]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-primary)] p-8">
      <div className="glass-card p-8 text-center max-w-md w-full">
        <h2 className="text-lg font-semibold text-white mb-2">
          Escanea el codigo QR
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Abre WhatsApp en tu telefono &gt; Dispositivos vinculados &gt; Vincular un dispositivo
        </p>
        <div className="bg-white p-3 rounded-xl inline-block">
          <canvas ref={canvasRef} />
        </div>
        <p className="mt-6 text-xs text-[var(--text-muted)]">
          El QR expira en 60 segundos. Si no funciona, se generara uno nuevo.
        </p>
      </div>
    </div>
  );
}
