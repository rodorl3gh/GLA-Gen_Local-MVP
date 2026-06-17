"use client";

import { CartItem } from "@/app/menu/page";

function getImageUrl(product: any): string | null {
  if (!product.image_path) return null;
  if (product.image_path.startsWith("/uploads/")) return product.image_path;
  const filename = product.image_path.replace(/\\/g, "/").split("/").pop();
  if (filename) return `/uploads/catalog/${filename}`;
  return null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: number, delta: number) => void;
  total: number;
  onCheckout: () => void;
}

export default function CartDrawer({ open, onClose, cart, onUpdateQuantity, total, onCheckout }: Props) {
  return (
    <div className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-40 shadow-2xl flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--brand-border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--brand-text)]">Tu Pedido</h2>
            <p className="text-xs text-[var(--brand-text-muted)]">
              {cart.reduce((s, i) => s + i.quantity, 0)} items
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5 text-[var(--brand-text)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              </div>
              <p className="text-sm text-[var(--brand-text-secondary)]">Carrito vacio</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item) => {
                const imgUrl = getImageUrl(item.product);
                return (
                <div key={item.product.id} className={`${item.isPromo ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5" : "bg-gray-50 border border-transparent"} rounded-xl overflow-hidden`}>
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-14 h-14 rounded-lg bg-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {imgUrl ? (
                        <img src={imgUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-[var(--brand-text)] truncate">{item.product.name}</p>
                        {item.isPromo && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            item.product.category === "Promocion" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                          }`}>
                            {item.product.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--brand-text-muted)]">${item.product.price.toFixed(0)}</p>
                    </div>
                    {!item.isPromo ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => onUpdateQuantity(item.product.id, -1)}
                          className="w-7 h-7 rounded-lg border border-[var(--brand-border)] flex items-center justify-center text-sm hover:bg-gray-100">-</button>
                        <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.product.id, 1)}
                          className="w-7 h-7 rounded-lg border border-[var(--brand-border)] flex items-center justify-center text-sm hover:bg-gray-100">+</button>
                      </div>
                    ) : (
                      <button onClick={() => onUpdateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded-lg bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                  {item.isPromo && item.promoSubItems && item.promoSubItems.length > 0 && (
                    <div className="px-3 pb-3 border-t border-[var(--brand-primary)]/10 pt-2">
                      <p className="text-[10px] text-[var(--brand-text-muted)] uppercase tracking-wider mb-1">Incluye</p>
                      {item.promoSubItems.map((sub, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-[var(--brand-text-secondary)] py-0.5">
                          <span className="w-1 h-1 rounded-full bg-[var(--brand-primary)] shrink-0" />
                          {sub.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );})}

            </div>

            <div className="p-4 border-t border-[var(--brand-border)] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--brand-text-secondary)]">Total</span>
                <span className="text-xl font-bold text-[var(--brand-text)]">${total.toFixed(0)}</span>
              </div>
              <button onClick={onCheckout} className="btn-primary w-full py-3 text-base">
                Continuar Pedido
              </button>
            </div>
          </>
        )}
      </div>
  );
}
