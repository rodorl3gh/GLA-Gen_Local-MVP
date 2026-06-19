"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResultadoPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [resultStatus, setResultStatus] = useState<"approved" | "pending" | "rejected" | "error">("pending");
  const [orderId, setOrderId] = useState<string>("");

  useEffect(() => {
    const status = searchParams.get("status") || searchParams.get("collection_status");
    const paymentId = searchParams.get("payment_id");
    const merchantOrderId = searchParams.get("merchant_order_id");
    const prefId = searchParams.get("preference_id");
    const extRef = searchParams.get("external_reference");
    const oid = searchParams.get("orderId");

    if (oid) setOrderId(oid);

    // Map MP status to our status
    if (status === "approved") {
      setResultStatus("approved");
    } else if (status === "rejected" || status === "failure") {
      setResultStatus("rejected");
    } else if (status === "pending" || status === "in_process") {
      setResultStatus("pending");
    }

    // If we have a payment_id, update the order
    if (paymentId && oid) {
      fetch(`/api/orders/${oid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_status: status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending",
        }),
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const config = {
    approved: {
      title: "Pago Aprobado",
      desc: "Tu pago fue procesado con exito.",
      detal: "En breve recibiras la confirmacion de tu pedido.",
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    pending: {
      title: "Pago Pendiente",
      desc: "Tu pago esta siendo procesado.",
      detal: "Te notificaremos cuando se confirme.",
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    rejected: {
      title: "Pago Rechazado",
      desc: "Tu pago no pudo ser procesado.",
      detal: "Intenta de nuevo con otro metodo de pago.",
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
      icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    error: {
      title: "Error",
      desc: "Ocurrio un error al procesar tu pago.",
      detal: "Intenta de nuevo mas tarde.",
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
    },
  };

  const c = config[resultStatus];

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center p-4">
      <div className={`max-w-sm w-full rounded-2xl border-2 p-8 text-center ${c.bg}`}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${resultStatus === "approved" ? "bg-emerald-100" : resultStatus === "pending" ? "bg-amber-100" : "bg-red-100"} flex items-center justify-center`}>
              <svg className={`w-8 h-8 ${c.color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.icon} />
              </svg>
            </div>
            <h2 className={`text-lg font-bold ${c.color} mb-2`}>{c.title}</h2>
            <p className="text-sm text-[var(--brand-text-secondary)] mb-1">{c.desc}</p>
            <p className="text-xs text-[var(--brand-text-muted)] mb-6">{c.detal}</p>
            {orderId && (
              <p className="text-xs text-[var(--brand-text-muted)] mb-4">
                Pedido <span className="font-mono font-semibold text-[var(--brand-primary)]">#{orderId}</span>
              </p>
            )}
            {resultStatus === "rejected" && (
              <Link href="/menu" className="block w-full py-3 bg-[var(--brand-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--brand-primary-dark)] transition-all mb-2">
                Volver al menu
              </Link>
            )}
            <Link href="/menu" className={`block w-full py-3 ${resultStatus === "rejected" ? "border border-[var(--brand-border)] text-[var(--brand-text)] bg-white" : "bg-[var(--brand-primary)] text-white"} text-sm font-semibold rounded-xl hover:bg-[var(--brand-primary-dark)] transition-all`}>
              {resultStatus === "approved" ? "Seguir comprando" : resultStatus === "pending" ? "Volver al menu" : "Intentar de nuevo"}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
