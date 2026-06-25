"use client";

import { CartItem } from "./CustomizationModal";
import { useState, useEffect } from "react";

interface PaymentMethod {
  id: number;
  name: string;
  enabled: number;
  details: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  onSuccess: () => void;
}

type Step = "form" | "preticket" | "ticket";

export default function CheckoutModal({ open, onClose, cart, total, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [clientName, setClientName] = useState("");
  const [mesa, setMesa] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      fetch("/api/payments")
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d)) setMethods(d.filter((m: PaymentMethod) => m.enabled === 1));
        })
        .catch(() => {});
      setStep("form");
      setClientName("");
      setMesa("");
      setPaymentMethod("");
      setError("");
      setOrderId(null);
    }
  }, [open]);

  const goToPreTicket = () => {
    if (!clientName.trim()) { setError("Ingresa el nombre del cliente"); return; }
    if (!paymentMethod) { setError("Selecciona un metodo de pago"); return; }
    setError("");
    setStep("preticket");
  };

  const confirmAndCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const items = cart.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        ...(item.notes ? { notes: item.notes } : {}),
        ...(item.promoSubItems ? { promoSubItems: item.promoSubItems } : {}),
      }));

      const notesParts: string[] = [];
      if (clientName.trim()) notesParts.push(`Cliente: ${clientName.trim()}`);
      if (mesa.trim()) notesParts.push(`Mesa: ${mesa.trim()}`);

      const res = await fetch("/api/orders/web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "POS",
          name: clientName.trim(),
          items,
          total,
          payment_method: paymentMethod,
          notes: notesParts.join(" | "),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrderId(data.orderId);
        setStep("ticket");
      } else {
        setStep("preticket");
        setError(data.error || "Error al crear pedido");
      }
    } catch {
      setStep("preticket");
      setError("Error de conexion");
    }
    setLoading(false);
  };

  const finish = () => {
    onClose();
    setStep("form");
    onSuccess();
  };

  if (!open) return null;

  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
          {/* ── STEP 1: FORM ── */}
          {step === "form" && (
            <>
              <div className="p-4 border-b border-[var(--brand-border)] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--brand-text)]">Cobrar Pedido</h2>
                  <p className="text-[10px] text-[var(--brand-text-muted)]">{itemCount} producto(s)</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-50">
                  <svg className="w-5 h-5 text-[var(--brand-text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-center p-3 rounded-xl bg-[var(--brand-bg)]">
                  <p className="text-[10px] text-[var(--brand-text-muted)] uppercase tracking-wider">Total a cobrar</p>
                  <p className="text-3xl font-bold text-[var(--brand-primary)]">${total.toFixed(0)}</p>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[var(--brand-text-muted)] uppercase tracking-wider mb-1.5 block">Nombre del cliente</label>
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Juan Perez" autoFocus
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[var(--brand-text-muted)] uppercase tracking-wider mb-1.5 block">Mesa (opcional)</label>
                  <input type="text" value={mesa} onChange={(e) => setMesa(e.target.value)}
                    placeholder="Ej: 5"
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[var(--brand-text-muted)] uppercase tracking-wider mb-1.5 block">Metodo de pago</label>
                  <div className="flex gap-2">
                    {methods.map(m => (
                      <button key={m.id} onClick={() => setPaymentMethod(m.name)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          paymentMethod === m.name ? "bg-[var(--brand-primary)] text-white shadow-sm" : "bg-gray-100 text-[var(--brand-text-secondary)] hover:bg-gray-200"
                        }`}>{m.name}</button>
                    ))}
                  </div>
                </div>
                {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-center">{error}</div>}
                <button onClick={goToPreTicket}
                  className="w-full py-3 bg-[var(--brand-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--brand-primary-dark)] transition-all active:scale-[0.98]">
                  Revisar Pedido
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: PRE-TICKET ── */}
          {step === "preticket" && (
            <>
              <div className="p-4 border-b border-[var(--brand-border)] text-center">
                <h2 className="text-sm font-bold text-[var(--brand-text)]">Verificar Pedido</h2>
                <p className="text-[10px] text-[var(--brand-text-muted)]">Confirma que todo este correcto</p>
              </div>
              <div className="p-4 space-y-3">
                {/* Ticket content */}
                <div className="p-4 rounded-xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-bg)] space-y-2.5 font-mono">
                  <div className="text-center">
                    <p className="text-xs font-bold text-[var(--brand-text)]">Cafeteria Luna</p>
                    <p className="text-[9px] text-[var(--brand-text-muted)]">PUNTO DE VENTA</p>
                  </div>
                  <div className="border-t border-dashed border-[var(--brand-border)] my-1" />
                  {clientName && <p className="text-[10px] text-[var(--brand-text)]">Cliente: <span className="font-semibold">{clientName}</span></p>}
                  {mesa && <p className="text-[10px] text-[var(--brand-text)]">Mesa: <span className="font-semibold">{mesa}</span></p>}
                  <div className="border-t border-dashed border-[var(--brand-border)] my-1" />
                  <div className="space-y-1.5">
                    {cart.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-[10px]">
                          <span className="font-semibold text-[var(--brand-text)] truncate mr-2">{item.quantity}x {item.name}</span>
                          <span className="font-bold text-[var(--brand-text)] whitespace-nowrap">${(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                        {item.notes && <p className="text-[8px] text-[var(--brand-text-muted)] pl-2">{item.notes}</p>}
                        {item.promoSubItems && item.promoSubItems.length > 0 && (
                          <p className="text-[8px] text-amber-600 pl-2">{item.promoSubItems.map(s => s.name).join(", ")}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-dashed border-[var(--brand-border)] my-1" />
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[var(--brand-text)]">TOTAL</span>
                    <span className="font-bold text-[var(--brand-primary)] text-lg">${total.toFixed(0)}</span>
                  </div>
                  <div className="border-t border-dashed border-[var(--brand-border)] my-1" />
                  <p className="text-[9px] text-center text-[var(--brand-text-muted)]">{paymentMethod}</p>
                </div>

                {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-center">{error}</div>}

                <div className="flex gap-2">
                  <button onClick={() => setStep("form")}
                    className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-gray-100 text-[var(--brand-text-secondary)] hover:bg-gray-200 transition-all">
                    Volver
                  </button>
                  <button onClick={confirmAndCreate} disabled={loading}
                    className="flex-[2] py-2.5 rounded-xl text-sm font-semibold bg-[var(--brand-accent)] text-white hover:bg-emerald-600 disabled:opacity-40 transition-all active:scale-[0.98]">
                    {loading ? "Creando..." : "Confirmar y Cobrar"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 3: FINAL TICKET ── */}
          {step === "ticket" && (
            <>
              <div className="p-4 border-b border-[var(--brand-border)] text-center bg-[var(--brand-accent)]/5">
                <div className="w-10 h-10 rounded-full bg-[var(--brand-accent)] flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-sm font-bold text-[var(--brand-text)]">Pedido Creado</h2>
                <p className="text-[10px] text-[var(--brand-text-muted)]">Ticket #{orderId}</p>
              </div>
              <div className="p-4 space-y-3">
                {/* Final ticket */}
                <div className="p-4 rounded-xl border-2 border-[var(--brand-accent)] bg-white space-y-2.5 font-mono shadow-sm">
                  <div className="text-center">
                    <p className="text-sm font-bold text-[var(--brand-text)]">Cafeteria Luna</p>
                    <p className="text-[9px] text-[var(--brand-text-muted)]">PUNTO DE VENTA</p>
                    <p className="text-[10px] font-bold text-[var(--brand-primary)] mt-1">Pedido #{orderId}</p>
                  </div>
                  <div className="border-t border-[var(--brand-border)]" />
                  {clientName && <p className="text-[10px] text-[var(--brand-text)]">Cliente: <span className="font-semibold">{clientName}</span></p>}
                  {mesa && <p className="text-[10px] text-[var(--brand-text)]">Mesa: <span className="font-semibold">{mesa}</span></p>}
                  <div className="border-t border-[var(--brand-border)]" />
                  <div className="space-y-1.5">
                    {cart.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-[10px]">
                          <span className="font-semibold text-[var(--brand-text)] truncate mr-2">{item.quantity}x {item.name}</span>
                          <span className="font-bold text-[var(--brand-text)] whitespace-nowrap">${(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                        {item.notes && <p className="text-[8px] text-[var(--brand-text-muted)] pl-2">{item.notes}</p>}
                        {item.promoSubItems && item.promoSubItems.length > 0 && (
                          <p className="text-[8px] text-amber-600 pl-2">{item.promoSubItems.map(s => s.name).join(", ")}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[var(--brand-border)]" />
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-[var(--brand-text)]">TOTAL</span>
                    <span className="font-bold text-[var(--brand-accent)] text-xl">${total.toFixed(0)}</span>
                  </div>
                  <div className="border-t border-[var(--brand-border)]" />
                  <p className="text-[9px] text-center text-[var(--brand-text-muted)]">{paymentMethod}</p>
                  <p className="text-[8px] text-center text-[var(--brand-text-muted)]">Gracias por tu compra</p>
                </div>
                <button onClick={finish}
                  className="w-full py-3 bg-[var(--brand-accent)] text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-all active:scale-[0.98]">
                  Listo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
