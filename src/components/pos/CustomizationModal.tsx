"use client";

import { Product } from "@/app/pos/page";
import { useState, useCallback } from "react";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  notes: string;
  image_path: string;
  category: string;
  isPromo?: boolean;
  promoSubItems?: { name: string; productId: number }[];
}

interface Props {
  product: Product;
  open: boolean;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}

const SUGAR_OPTIONS = ["Con Azucar", "Sin Azucar", "Poca Azucar"] as const;
const MILK_OPTIONS = ["Leche Entera", "Leche Deslactosada", "Leche de Almendra", "Sin Leche"] as const;
const ADDON_OPTIONS = ["Sin agregados", "Con Mantequilla", "Con Mermelada"] as const;

function isDrink(category: string): boolean {
  const c = category.toLowerCase();
  return c.includes("bebida") || c.includes("caliente") || c.includes("fria");
}

function isBakery(category: string): boolean {
  return category.toLowerCase().includes("panaderia");
}

export default function CustomizationModal({ product, open, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [sugar, setSugar] = useState<string | null>(null);
  const [milk, setMilk] = useState<string | null>(null);
  const [addon, setAddon] = useState<string | null>(null);
  const [extraNote, setExtraNote] = useState("");

  const showDrinkOptions = isDrink(product.category);
  const showBakeryOptions = isBakery(product.category);

  const handleAdd = useCallback(() => {
    const notesParts: string[] = [];
    if (showDrinkOptions) {
      if (sugar) notesParts.push(sugar);
      if (milk) notesParts.push(milk);
    }
    if (showBakeryOptions) {
      if (addon) notesParts.push(addon);
    }
    if (extraNote.trim()) notesParts.push(extraNote.trim());

    onAdd({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      notes: notesParts.join(" · "),
      image_path: product.image_path,
      category: product.category,
    });

    // Reset state
    setQuantity(1);
    setSugar(null);
    setMilk(null);
    setAddon(null);
    setExtraNote("");
    onClose();
  }, [product, quantity, sugar, milk, addon, extraNote, showDrinkOptions, showBakeryOptions, onAdd, onClose]);

  const toggleSugar = (opt: string) => setSugar(prev => prev === opt ? null : opt);
  const toggleMilk = (opt: string) => setMilk(prev => prev === opt ? null : opt);
  const toggleAddon = (opt: string) => setAddon(prev => prev === opt ? null : opt);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-[var(--brand-border)] flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand-bg)] overflow-hidden flex-shrink-0">
              {product.image_path ? (
                <img
                  src={product.image_path.startsWith("/uploads/") ? product.image_path : `/uploads/catalog/${product.image_path.replace(/\\/g, "/").split("/").pop()}`}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--brand-primary)]/10">
                  <svg className="w-5 h-5 text-[var(--brand-primary)]/30" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-[var(--brand-text)] truncate">{product.name}</h2>
              <p className="text-lg font-bold text-[var(--brand-primary)]">${product.price.toFixed(0)}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-50 flex-shrink-0">
              <svg className="w-5 h-5 text-[var(--brand-text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Quantity */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--brand-text-secondary)]">Cantidad</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-8 h-8 rounded-lg border border-[var(--brand-border)] flex items-center justify-center text-sm font-medium disabled:opacity-30 hover:bg-gray-50"
                >-</button>
                <span className="text-lg font-bold text-[var(--brand-text)] w-6 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg border border-[var(--brand-border)] flex items-center justify-center text-sm font-medium hover:bg-gray-50"
                >+</button>
              </div>
            </div>

            {/* Drink options */}
            {showDrinkOptions && (
              <>
                <div>
                  <label className="text-[10px] font-semibold text-[var(--brand-text-muted)] uppercase tracking-wider mb-2 block">
                    Azucar
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGAR_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => toggleSugar(opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          sugar === opt
                            ? "bg-[var(--brand-primary)] text-white shadow-sm"
                            : "bg-gray-100 text-[var(--brand-text-secondary)] hover:bg-gray-200"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[var(--brand-text-muted)] uppercase tracking-wider mb-2 block">
                    Leche
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {MILK_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => toggleMilk(opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          milk === opt
                            ? "bg-[var(--brand-primary)] text-white shadow-sm"
                            : "bg-gray-100 text-[var(--brand-text-secondary)] hover:bg-gray-200"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Bakery options */}
            {showBakeryOptions && (
              <div>
                <label className="text-[10px] font-semibold text-[var(--brand-text-muted)] uppercase tracking-wider mb-2 block">
                  Agregados
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ADDON_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => toggleAddon(opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        addon === opt
                          ? "bg-[var(--brand-primary)] text-white shadow-sm"
                          : "bg-gray-100 text-[var(--brand-text-secondary)] hover:bg-gray-200"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Extra note */}
            <div>
              <label className="text-[10px] font-semibold text-[var(--brand-text-muted)] uppercase tracking-wider mb-1.5 block">
                Nota extra
              </label>
              <input
                type="text"
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                placeholder="Ej: sin canela, muy caliente..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] text-xs text-[var(--brand-text)] placeholder:text-[var(--brand-text-muted)] focus:outline-none focus:border-[var(--brand-primary)]/50"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--brand-border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[var(--brand-text-secondary)]">Subtotal</span>
              <span className="text-lg font-bold text-[var(--brand-primary)]">
                ${(product.price * quantity).toFixed(0)}
              </span>
            </div>
            <button
              onClick={handleAdd}
              className="w-full py-2.5 bg-[var(--brand-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--brand-primary-dark)] transition-all active:scale-[0.98]"
            >
              Agregar {quantity > 1 ? `${quantity} ` : ""}al pedido
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
