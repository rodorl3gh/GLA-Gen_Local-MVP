"use client";

import { CartItem } from "./CustomizationModal";
import { useState, useEffect, useCallback } from "react";

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

export default function CheckoutModal({ open, onClose, cart, total, onSuccess }: Props) {
  const [clientName, setClientName] = useState("");
  const [mesa, setMesa] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/payments")
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d)) setMethods(d.filter((m: PaymentMethod) => m.enabled === 1));
        })
        .catch(() => {});
      setClientName("");
      setMesa("");
      setPaymentMethod("");
      setError("");
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!clientName.trim()) {
      setError("Ingresa el nombre del cliente");
      return;
    }
    if (!paymentMethod) {
      setError("Selecciona un metodo de pago");
      return;
    }

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
        onSuccess();
      } else {
        setError(data.error || "Error al crear pedido");
      }
    } catch {
      setError("Error de conexion");
    }
    setLoading(false);
  }, [clientName, mesa, paymentMethod, cart, total, onSuccess]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-[var(--brand-border)] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--brand-text)]">Cobrar Pedido</h2>
              <p className="text-[10px] text-[var(--brand-text-muted)]">{cart.length} producto(s)</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-50">
              <svg className="w-5 h-5 text-[var(--brand-text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Total */}
            <div className="text-center p-3 rounded-xl bg-[var(--brand-bg)]">
              <p className="text-[10px] text-[var(--brand-text-muted)] uppercase tracking-wider">Total a cobrar</p>
              <p className="text-3xl font-bold text-[var(--brand-primary)]">${total.toFixed(0)}</p>
            </div>

            {/* Client name */}
            <div>
              <label className="text-[10px] font-semibold text-[var(--brand-text-muted)] uppercase tracking-wider mb-1.5 block">
                Nombre del cliente
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ej: Juan Perez"
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50"
              />
            </div>

            {/* Mesa */}
            <div>
              <label className="text-[10px] font-semibold text-[var(--brand-text-muted)] uppercase tracking-wider mb-1.5 block">
                Mesa (opcional)
              </label>
              <input
                type="text"
                value={mesa}
                onChange={(e) => setMesa(e.target.value)}
                placeholder="Ej: 5"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg)] text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50"
              />
            </div>

            {/* Payment method */}
            <div>
              <label className="text-[10px] font-semibold text-[var(--brand-text-muted)] uppercase tracking-wider mb-1.5 block">
                Metodo de pago
              </label>
              <div className="flex gap-2">
                {methods.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.name)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      paymentMethod === m.name
                        ? "bg-[var(--brand-primary)] text-white shadow-sm"
                        : "bg-gray-100 text-[var(--brand-text-secondary)] hover:bg-gray-200"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-center">{error}</div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-[var(--brand-accent)] text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {loading ? "Generando pedido..." : "Cobrar y Generar Pedido"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
