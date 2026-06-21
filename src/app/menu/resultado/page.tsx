"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type ResultStatus = "approved" | "pending" | "rejected" | "cancelled" | "error";

function ResultadoContent() {
  const searchParams = useSearchParams();
  const [resultStatus, setResultStatus] = useState<ResultStatus>("cancelled");
  const [refCode, setRefCode] = useState<string>("");

  useEffect(() => {
    const collectionStatus = searchParams.get("collection_status") || "";
    const mpStatus = searchParams.get("status") || "";
    const result = searchParams.get("result") || "";
    const ref = searchParams.get("ref") || searchParams.get("orderId") || "";
    const paymentId = searchParams.get("payment_id");

    if (ref) setRefCode(ref);

    // 1. MP confirmed the payment
    if (collectionStatus === "approved" || mpStatus === "approved") {
      setResultStatus("approved");
    }
    // 2. MP rejected the payment
    else if (collectionStatus === "rejected" || mpStatus === "rejected") {
      setResultStatus("rejected");
    }
    // 3. MP says it's still processing (genuine pending)
    else if (collectionStatus === "pending" || collectionStatus === "in_process") {
      setResultStatus("pending");
    }
    // 4. User returned via our failure back URL — didn't complete payment
    else if (result === "failure") {
      setResultStatus("cancelled");
    }
    // 5. User returned via our pending back URL without MP confirmation
    else if (result === "pending" && !paymentId) {
      setResultStatus("cancelled");
    }
    // 6. No indicators — user probably abandoned
    else if (!collectionStatus && !mpStatus && !paymentId) {
      setResultStatus("cancelled");
    }
    // 7. Fallback: treat as pending if we have payment_id but unclear status
    else if (paymentId) {
      setResultStatus("pending");
    }
  }, [searchParams]);

  const config: Record<ResultStatus, { title: string; desc: string; detal: string; color: string; bg: string; icon: string; showRef: boolean }> = {
    approved: {
      title: "Pago Aprobado",
      desc: "Tu pago fue procesado con exito.",
      detal: "Tu pedido se esta generando. En breve recibiras la confirmacion.",
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      showRef: true,
    },
    pending: {
      title: "Pago en Proceso",
      desc: "Tu pago esta siendo procesado por Mercado Pago.",
      detal: "Te notificaremos cuando se confirme. Esto puede tomar unos minutos.",
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      showRef: true,
    },
    rejected: {
      title: "Pago Rechazado",
      desc: "Tu pago no pudo ser procesado por Mercado Pago.",
      detal: "No se realizo ningun cargo. Intenta con otro metodo de pago o una tarjeta diferente.",
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
      icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
      showRef: false,
    },
    cancelled: {
      title: "Pago no Completado",
      desc: "No terminaste el proceso de pago.",
      detal: "No se realizo ningun cargo a tu tarjeta. Vuelve a intentarlo cuando estes listo. Gracias por visitarnos!",
      color: "text-sky-600",
      bg: "bg-sky-50 border-sky-200",
      icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
      showRef: false,
    },
    error: {
      title: "Error",
      desc: "Ocurrio un error inesperado.",
      detal: "Intenta de nuevo mas tarde o contactanos por WhatsApp.",
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
      showRef: false,
    },
  };

  const c = config[resultStatus];

  const iconBg = resultStatus === "approved" ? "bg-emerald-100"
    : resultStatus === "pending" ? "bg-amber-100"
    : resultStatus === "cancelled" ? "bg-sky-100"
    : "bg-red-100";

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center p-4">
      <div className={`max-w-sm w-full rounded-2xl border-2 p-8 text-center ${c.bg} animate-fade-in-up`}>
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${iconBg} flex items-center justify-center`}>
          <svg className={`w-8 h-8 ${c.color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.icon} />
          </svg>
        </div>
        <h2 className={`text-lg font-bold ${c.color} mb-2`}>{c.title}</h2>
        <p className="text-sm text-[var(--brand-text-secondary)] mb-1">{c.desc}</p>
        <p className="text-xs text-[var(--brand-text-muted)] mb-6">{c.detal}</p>

        {c.showRef && refCode && (
          <p className="text-xs text-[var(--brand-text-muted)] mb-4">
            Referencia <span className="font-mono font-semibold text-[var(--brand-primary)]">#{refCode.slice(-12)}</span>
          </p>
        )}

        <div className="space-y-2">
          {resultStatus === "cancelled" && (
            <Link href="/menu" className="block w-full py-3 bg-[var(--brand-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--brand-primary-dark)] transition-all">
              Volver a intentar
            </Link>
          )}
          {resultStatus === "rejected" && (
            <Link href="/menu" className="block w-full py-3 bg-[var(--brand-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--brand-primary-dark)] transition-all">
              Intentar con otro metodo
            </Link>
          )}
          <Link href="/menu" className={`block w-full py-3 ${resultStatus === "cancelled" || resultStatus === "rejected" ? "border border-[var(--brand-border)] text-[var(--brand-text)] bg-white hover:bg-gray-50" : "bg-[var(--brand-primary)] text-white"} text-sm font-semibold rounded-xl hover:bg-[var(--brand-primary-dark)] transition-all`}>
            {resultStatus === "approved" ? "Seguir comprando" : "Volver al menu"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResultadoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full" />
      </div>
    }>
      <ResultadoContent />
    </Suspense>
  );
}
