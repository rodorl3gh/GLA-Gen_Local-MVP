"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { CartItem } from "@/app/menu/page";

interface Props {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  tableNumber: number | null;
  onSuccess: () => void;
}

interface PaymentMethod {
  id: number;
  name: string;
  enabled: number;
  details: string[];
}

interface TicketData {
  orderId: number;
  clientName: string;
  clientPhone: string;
  payment: string;
  notes: string;
  items: CartItem[];
  total: number;
  date: string;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

function getMpPublicKey(): string {
  const mode = process.env.NEXT_PUBLIC_MP_MODE || "production";
  return mode === "sandbox"
    ? process.env.NEXT_PUBLIC_MERCADOPAGO_SANDBOX_PUBLIC_KEY || ""
    : process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "";
}

export default function CheckoutForm({ open, onClose, cart, total, tableNumber, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(tableNumber ? `Mesa ${tableNumber}` : "");
  const [payment, setPayment] = useState("Efectivo");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [ticket, setTicket] = useState<TicketData | null>(null);

  const [mpLoaded, setMpLoaded] = useState(false);
  const [mpBrickLoading, setMpBrickLoading] = useState(false);
  const brickContainerRef = useRef<HTMLDivElement>(null);

  const isMpCard = payment === "Tarjeta";
  const selectedMethod = useMemo(() =>
    paymentMethods.find(m => m.name === payment) || null,
    [paymentMethods, payment]
  );

  useEffect(() => {
    if (!open) return;
    fetch("/api/payments")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          const enabled = d.filter((m: PaymentMethod) => m.enabled === 1);
          setPaymentMethods(enabled);
          if (enabled.length > 0) setPayment(enabled[0].name);
        }
      })
      .catch(() => {});
  }, [open]);

  const loadMpSdk = useCallback(() => {
    const mpKey = getMpPublicKey();
    if (!mpKey) {
      setMpLoaded(false);
      setError("Credenciales de Mercado Pago no configuradas. Revisa NEXT_PUBLIC_MERCADOPAGO_SANDBOX_PUBLIC_KEY en .env.local");
      return;
    }

    if (document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]')) {
      if (window.MercadoPago) { setMpLoaded(true); return; }
      const checkExist = setInterval(() => {
        if (window.MercadoPago) { setMpLoaded(true); clearInterval(checkExist); }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => {
      const mpKey = getMpPublicKey();
      if (mpKey && window.MercadoPago) new window.MercadoPago(mpKey, { locale: "es-MX" });
      setMpLoaded(true);
    };
    script.onerror = () => setMpLoaded(false);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!open || !isMpCard) return;
    loadMpSdk();
  }, [open, isMpCard, loadMpSdk]);

  useEffect(() => {
    if (!open) {
      setStep(1); setSent(false); setTicket(null);
      setPhone(tableNumber ? `Mesa ${tableNumber}` : "");
      setName(""); setNotes(""); setError("");
      setMpLoaded(false); setMpBrickLoading(false);
    }
  }, [open, tableNumber]);

  const renderCardBrick = useCallback(async () => {
    if (!brickContainerRef.current || !window.MercadoPago || !mpLoaded) return;
    const mpKey = getMpPublicKey();
    const mp = new window.MercadoPago(mpKey, { locale: "es-MX" });
    brickContainerRef.current.innerHTML = "";
    setMpBrickLoading(true);
    setError("");

    const bricksBuilder = mp.bricks();
    const onSubmit = async (formData: any) => {
      setSending(true);
      setError("");
      const items = cart.map((i) => ({ name: i.product.name, quantity: i.quantity, price: i.product.price }));
      try {
        const res = await fetch("/api/mercadopago/process-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentType: "card",
            token: formData.token || undefined,
            paymentMethodId: formData.payment_method_id || undefined,
            installments: formData.installments || 1,
            issuerId: formData.issuer_id || undefined,
            payerEmail: formData.payer?.email || `${name || "cliente"}@test.com`,
            payerFirstName: formData.payer?.first_name || name || "Cliente",
            payerLastName: formData.payer?.last_name || "",
            items, total, notes: notes.trim(), phone: phone.trim(), clientName: name || "Anonimo",
          }),
        });
        const data = await res.json();
        if (data.success && data.orderId) {
          setTicket({ orderId: data.orderId, clientName: name || "Anonimo", clientPhone: phone.trim(), payment, notes: notes.trim(), items: [...cart], total, date: new Date().toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) });
          onSuccess(); setSent(true);
        } else { setError(data.error || "Error al procesar el pago"); }
      } catch { setError("Error de conexion. Intenta de nuevo."); }
      setSending(false);
    };
    try {
      await bricksBuilder.create("cardPayment", brickContainerRef.current.id, {
        initialization: { amount: total, payer: { firstName: name || "Cliente" } },
        customization: { visual: { style: { theme: "default" }, hidePaymentButton: false }, paymentMethods: { maxInstallments: 6 } },
        callbacks: { onSubmit, onError: (e: any) => { setMpBrickLoading(false); setError(e?.message || "Error al cargar formulario"); }, onReady: () => setMpBrickLoading(false) },
      });
    } catch (e: any) { setMpBrickLoading(false); setError(e?.message || "Error al inicializar formulario"); }
  }, [mpLoaded, total, name, phone, notes, cart, onSuccess]);

  useEffect(() => {
    if (step === 3 && isMpCard && mpLoaded && brickContainerRef.current && open) {
      const timer = setTimeout(() => renderCardBrick(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, isMpCard, mpLoaded, open, renderCardBrick]);

  if (!open) return null;

  const digitsOnly = phone.replace(/\D/g, "");
  const isValidPhone = digitsOnly.length === 10;

  const handleContinue = () => {
    setError("");
    if (step === 1) { setStep(2); return; }
    if (step === 2) {
      if (!phone.trim()) { setError("Ingresa tu mesa o telefono"); return; }
      if (!tableNumber && !isValidPhone) { setError("El telefono debe tener exactamente 10 digitos"); return; }
      setStep(3); return;
    }
    handleSubmitEfectivo();
  };

  const handleSubmitEfectivo = async () => {
    setSending(true); setError("");
    try {
      const items = cart.map((i) => ({ name: i.product.name, quantity: i.quantity, price: i.product.price }));
      const res = await fetch("/api/orders/web", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `${name || "Cliente"} - ${phone.trim()}`, name: name || "Anonimo", items, total, payment_method: payment, notes: notes.trim() }),
      });
      const data = await res.json();
      if (data.orderId) {
        setTicket({ orderId: data.orderId, clientName: name || "Anonimo", clientPhone: phone.trim(), payment, notes: notes.trim(), items: [...cart], total, date: new Date().toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) });
      }
      onSuccess();
    } catch {}
    setSending(false); setSent(true);
  };

  const displayMethods = paymentMethods.length > 0 ? paymentMethods : [{ id: 0, name: "Efectivo", enabled: 1, details: [] }];
  const stepLabels = ["Revisar", "Tus Datos", "Confirmar"];
  const currentLabel = sent ? "Pedido" : stepLabels[step - 1];

  const renderTicket = () => (
    <div className="p-6">
      <div className="border-2 border-dashed border-[var(--brand-primary)]/30 rounded-2xl p-5 bg-[var(--brand-bg)]">
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center text-white font-bold text-lg mx-auto mb-2">L</div>
          <h3 className="text-sm font-bold text-[var(--brand-text)]">Cafeteria Luna Test</h3>
          <p className="text-[10px] text-[var(--brand-text-muted)]">Ticket de Pedido</p>
        </div>
        <div className="border-t border-dashed border-[var(--brand-border)] pt-3 mb-3">
          <div className="flex justify-between text-[10px] text-[var(--brand-text-muted)] mb-2">
            <span className="font-mono font-semibold text-[var(--brand-primary)]">#{String(ticket!.orderId).padStart(4, "0")}</span>
            <span>{ticket!.date}</span>
          </div>
          <p className="text-[12px] font-semibold text-[var(--brand-text)]">{ticket!.clientName}</p>
          <p className="text-[11px] text-[var(--brand-text-secondary)]">{ticket!.clientPhone}</p>
          <p className="text-[10px] text-[var(--brand-text-muted)]">Pago: {ticket!.payment}</p>
        </div>
        <div className="border-t border-dashed border-[var(--brand-border)] pt-3 pb-2 space-y-2">
          {ticket!.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start text-xs">
              <div className="flex-1">
                <span className="text-[var(--brand-text)] font-medium">{item.product.name}</span>
                <span className="text-[var(--brand-text-muted)] ml-1">x{item.quantity}</span>
                {item.isPromo && item.promoSubItems && (
                  <div className="mt-1">{item.promoSubItems.map((sub: any, si: number) => (
                    <div key={si} className="flex items-center gap-1 text-[10px] text-[var(--brand-text-muted)]"><span className="w-1 h-1 rounded-full bg-[var(--brand-primary)]" />{sub.name}</div>
                  ))}</div>
                )}
              </div>
              <span className="text-[var(--brand-text-secondary)] font-semibold ml-2">${(item.product.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-[var(--brand-border)] pt-3 space-y-1">
          <div className="flex justify-between text-[10px] text-[var(--brand-text-muted)]"><span>Subtotal</span><span>${ticket!.total.toFixed(0)}</span></div>
          <div className="flex justify-between items-center pt-1"><span className="text-xs font-bold text-[var(--brand-text)]">TOTAL</span><span className="text-xl font-bold text-[var(--brand-primary)]">${ticket!.total.toFixed(0)}</span></div>
          <div className="flex justify-between text-[10px] text-[var(--brand-text-muted)]"><span>Metodo de pago</span><span>{ticket!.payment}</span></div>
        </div>
        {ticket!.notes && (<div className="border-t border-dashed border-[var(--brand-border)] mt-3 pt-3"><p className="text-[10px] text-[var(--brand-text-muted)] uppercase mb-0.5 font-semibold">Notas</p><p className="text-[11px] text-[var(--brand-text-secondary)] italic">{ticket!.notes}</p></div>)}
      </div>
      <button onClick={onClose} className="w-full mt-4 py-3 bg-[var(--brand-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--brand-primary-dark)] transition-all">Cerrar</button>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
          {sent && ticket ? renderTicket() : (
            <>
              <div className="p-5 border-b border-[var(--brand-border)] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--brand-text)]">{currentLabel}</h2>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3].map((s) => (<div key={s} className={`w-10 h-1 rounded-full transition-all ${s <= step ? "bg-[var(--brand-primary)]" : "bg-gray-200"}`} />))}
                  </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-50">
                  <svg className="w-5 h-5 text-[var(--brand-text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {step === 1 && (
                <div className="p-5 space-y-3">
                  <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
                    {cart.map((item) => (
                      <div key={item.product.id}>
                        <div className="flex justify-between">
                          <span className="text-[var(--brand-text)]">{item.product.name} <span className="text-[var(--brand-text-muted)]">x{item.quantity}</span>
                            {item.isPromo && (<span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${item.product.category === "Promocion" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>{item.product.category}</span>)}
                          </span>
                          <span className="text-[var(--brand-text-secondary)] font-medium">${(item.product.price * item.quantity).toFixed(0)}</span>
                        </div>
                        {item.isPromo && item.promoSubItems && (
                          <div className="mt-1 ml-2 space-y-0.5">{item.promoSubItems.map((sub, idx) => (<div key={idx} className="flex items-center gap-1 text-[11px] text-[var(--brand-text-muted)]"><span className="w-1 h-1 rounded-full bg-[var(--brand-primary)]" />{sub.name}</div>))}</div>
                        )}
                      </div>
                    ))}
                    <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-semibold">
                      <span className="text-[var(--brand-text)]">{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
                      <span className="text-[var(--brand-primary)] text-lg">${total.toFixed(0)}</span>
                    </div>
                  </div>
                  <button onClick={handleContinue} className="btn-primary w-full py-3 text-base font-semibold">Continuar →</button>
                </div>
              )}

              {step === 2 && (
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[var(--brand-text-secondary)] mb-1.5 block uppercase tracking-wider">Como te llamamos?</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all" placeholder="Tu nombre" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--brand-text-secondary)] mb-1.5 block uppercase tracking-wider">Mesa o Telefono *</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} required maxLength={10}
                      className={`w-full px-4 py-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition-all ${!tableNumber && phone.length > 0 && !isValidPhone ? "border-red-300 focus:ring-red-200 focus:border-red-400" : "border-[var(--brand-border)] focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"}`} placeholder="10 digitos: 5512345678" />
                    {!tableNumber && (<p className={`text-[10px] mt-1 ${phone.length > 0 && !isValidPhone ? "text-red-400" : "text-[var(--brand-text-muted)]"}`}>{phone.length === 0 ? "Debe tener exactamente 10 digitos" : !isValidPhone ? `Faltan ${10 - digitsOnly.length} digitos` : "Numero valido"}</p>)}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--brand-text-secondary)] mb-1.5 block uppercase tracking-wider">Metodo de pago</label>
                    <div className={`grid gap-2 ${displayMethods.length <= 2 ? "grid-cols-2" : "grid-cols-2"}`}>
                      {displayMethods.map((m) => (
                        <button key={m.id} type="button" onClick={() => setPayment(m.name)}
                          className={`py-2.5 px-2 text-xs rounded-xl border font-medium transition-all ${payment === m.name ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "border-[var(--brand-border)] text-[var(--brand-text-secondary)] hover:border-[var(--brand-primary-light)] bg-white"}`}>
                          {m.name}
                        </button>
                      ))}
                    </div>
                    {isMpCard && (
                      <p className="text-[10px] text-[var(--brand-primary)] mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Pago seguro via Mercado Pago
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--brand-text-secondary)] mb-1.5 block uppercase tracking-wider">Notas adicionales</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] resize-none transition-all" placeholder="Ej: sin azucar, extra shot, sin hielo..." />
                  </div>
                  {error && (<p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>)}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setStep(1)} className="btn-outline flex-1 py-3 text-sm font-medium">← Atras</button>
                    <button onClick={handleContinue} className="btn-primary flex-1 py-3 text-sm font-semibold">
                      {isMpCard ? "Ir a Pagar →" : "Revisar Pedido →"}
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="p-5 space-y-4">
                  {isMpCard ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-[var(--brand-bg)] rounded-xl border border-[var(--brand-border)]">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-[var(--brand-text)]">Total a pagar</span>
                          <span className="text-lg font-bold text-[var(--brand-primary)]">${total.toFixed(0)}</span>
                        </div>
                        <p className="text-[10px] text-[var(--brand-text-muted)]">Ingresa los datos de tu tarjeta para completar el pago.</p>
                      </div>
                      {mpBrickLoading && (<div className="flex items-center justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full" /><span className="ml-2 text-xs text-[var(--brand-text-muted)]">Cargando formulario de pago...</span></div>)}
                      {!mpLoaded && !mpBrickLoading && (<div className="flex items-center justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full" /><span className="ml-2 text-xs text-[var(--brand-text-muted)]">Conectando con Mercado Pago...</span></div>)}
                      <div id="mp-brick-container" ref={brickContainerRef} className={`min-h-[200px] ${mpBrickLoading || !mpLoaded ? "hidden" : ""}`} />
                      {error && (<div className="p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-red-600 text-xs">{error}</p></div>)}
                      {sending && (<div className="flex items-center justify-center gap-2 py-2"><div className="animate-spin w-4 h-4 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full" /><span className="text-xs text-[var(--brand-text-muted)]">Procesando pago...</span></div>)}
                      <button onClick={() => { setStep(2); setError(""); }} className="btn-outline w-full py-3 text-sm font-medium">← Cambiar metodo de pago</button>
                    </div>
                  ) : (
                    <>
                      <div className="border-2 border-dashed border-[var(--brand-primary)]/20 rounded-2xl p-4 bg-[var(--brand-bg)]">
                        <div className="text-center mb-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center text-white font-bold mx-auto mb-1">L</div>
                          <h3 className="text-xs font-semibold text-[var(--brand-text)]">Confirma tu pedido</h3>
                        </div>
                        <div className="text-[10px] space-y-2 mb-3">
                          <div className="flex justify-between"><span className="text-[var(--brand-text-muted)]">Cliente</span><span className="text-[var(--brand-text)] font-medium">{name || "Anonimo"}</span></div>
                          <div className="flex justify-between"><span className="text-[var(--brand-text-muted)]">Mesa / Tel</span><span className="text-[var(--brand-text)] font-medium">{phone}</span></div>
                          <div className="flex justify-between"><span className="text-[var(--brand-text-muted)]">Pago</span><span className="text-[var(--brand-text)] font-medium">{payment}</span></div>
                        </div>

                        {selectedMethod && selectedMethod.details && selectedMethod.details.length > 0 && (
                          <div className="border-t border-dashed border-[var(--brand-border)] pt-3 mb-3">
                            <p className="text-[10px] text-[var(--brand-text-muted)] uppercase mb-2 font-bold tracking-wider">Datos de pago</p>
                            <div className="space-y-2 bg-gray-100 rounded-xl p-3">
                              {selectedMethod.details.map((d, i) => (
                                <p key={i} className="text-[12px] text-gray-800 font-medium break-all">{d}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="border-t border-dashed border-[var(--brand-border)] pt-2 space-y-1.5">
                          {cart.map((item) => (
                            <div key={item.product.id}>
                              <div className="flex justify-between text-xs">
                                <span className="text-[var(--brand-text)]">{item.product.name} <span className="text-[var(--brand-text-muted)]">x{item.quantity}</span></span>
                                <span className="text-[var(--brand-text-secondary)] font-medium">${(item.product.price * item.quantity).toFixed(0)}</span>
                              </div>
                              {item.isPromo && item.promoSubItems && (<div className="mt-1 ml-2">{item.promoSubItems.map((sub, idx) => (<div key={idx} className="flex items-center gap-1 text-[10px] text-[var(--brand-text-muted)]"><span className="w-1 h-1 rounded-full bg-[var(--brand-primary)]" />{sub.name}</div>))}</div>)}
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-dashed border-[var(--brand-border)] pt-2 mt-2 flex justify-between items-center">
                          <span className="text-xs font-bold text-[var(--brand-text)]">TOTAL</span>
                          <span className="text-lg font-bold text-[var(--brand-primary)]">${total.toFixed(0)}</span>
                        </div>
                        {notes && (<div className="border-t border-dashed border-[var(--brand-border)] mt-2 pt-2"><p className="text-[10px] text-[var(--brand-text-muted)]"><span className="font-semibold">Notas:</span> {notes}</p></div>)}
                      </div>
                      {error && (<p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>)}
                      <div className="flex gap-2">
                        <button onClick={() => setStep(2)} className="btn-outline flex-1 py-3 text-sm font-medium">← Atras</button>
                        <button onClick={handleContinue} disabled={sending} className="btn-primary flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {sending ? "Enviando..." : "Confirmar Pedido"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
