"use client";

import { CartItem } from "./CustomizationModal";

interface Props {
  cart: CartItem[];
  onUpdateQuantity: (index: number, delta: number) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onReset: () => void;
  onCheckout: () => void;
  showClose?: boolean;
  onClose?: () => void;
}

export default function PosCartPanel({ cart, onUpdateQuantity, onEdit, onRemove, onReset, onCheckout, showClose, onClose }: Props) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 border-b border-[var(--brand-border)] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--brand-text)]">Pedido Actual</h2>
            <p className="text-[10px] text-[var(--brand-text-muted)]">{itemCount} producto{itemCount !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <button onClick={onReset}
                className="px-2.5 py-1 rounded-lg text-[10px] font-medium text-red-500 hover:bg-red-50 transition-colors">Reiniciar</button>
            )}
            {showClose && onClose && (
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-[var(--brand-text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <svg className="w-10 h-10 text-[var(--brand-border)] mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            <p className="text-xs text-[var(--brand-text-muted)]">Toca un producto para agregarlo</p>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div key={`${item.id}-${idx}-${item.notes}`} className="p-2.5 rounded-xl border border-[var(--brand-border)] hover:border-[var(--brand-primary-light)] transition-colors">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-[var(--brand-text)] truncate">{item.name}</p>
                    {item.isPromo && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Promo</span>}
                  </div>
                  {item.notes && <p className="text-[10px] text-[var(--brand-text-muted)] mt-0.5 truncate">{item.notes}</p>}
                  {item.promoSubItems && item.promoSubItems.length > 0 && (
                    <p className="text-[9px] text-[var(--brand-text-muted)] mt-0.5">{item.promoSubItems.map(s => s.name).join(", ")}</p>
                  )}
                </div>
                <span className="text-xs font-bold text-[var(--brand-text)] whitespace-nowrap">${(item.price * item.quantity).toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => onUpdateQuantity(idx, -1)} className="w-7 h-7 rounded-md border border-[var(--brand-border)] flex items-center justify-center text-sm hover:bg-gray-50">-</button>
                  <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                  <button onClick={() => onUpdateQuantity(idx, 1)} className="w-7 h-7 rounded-md border border-[var(--brand-border)] flex items-center justify-center text-sm hover:bg-gray-50">+</button>
                </div>
                <div className="flex gap-1">
                  {!item.isPromo && (
                    <button onClick={() => onEdit(idx)} className="p-1.5 rounded-md text-[10px] text-[var(--brand-text-muted)] hover:bg-gray-100 hover:text-[var(--brand-primary)] transition-colors" title="Editar">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  )}
                  <button onClick={() => onRemove(idx)} className="p-1.5 rounded-md text-[10px] text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Eliminar">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--brand-border)] flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-[var(--brand-text-secondary)]">Total</span>
          <span className="text-xl font-bold text-[var(--brand-primary)]">${total.toFixed(0)}</span>
        </div>
        <button onClick={onCheckout} disabled={cart.length === 0}
          className="w-full py-3 bg-[var(--brand-accent)] text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
          Cobrar
        </button>
      </div>
    </div>
  );
}
