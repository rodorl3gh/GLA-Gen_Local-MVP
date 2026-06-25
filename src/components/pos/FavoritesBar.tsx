"use client";

import { Product } from "@/app/pos/page";
import { useMemo } from "react";

interface Props {
  favorites: number[];
  products: Product[];
  onSelect: (product: Product) => void;
}

export default function FavoritesBar({ favorites, products, onSelect }: Props) {
  const favProducts = useMemo(
    () => products.filter(p => favorites.includes(p.id)),
    [favorites, products]
  );

  if (favProducts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-[10px] font-semibold text-[var(--brand-text-muted)] uppercase tracking-wider whitespace-nowrap">
        Favoritos
      </span>
      {favProducts.map(p => {
        const imgUrl = p.image_path?.startsWith("/uploads/")
          ? p.image_path
          : p.image_path
            ? `/uploads/catalog/${p.image_path.replace(/\\/g, "/").split("/").pop()}`
            : null;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300 transition-all flex-shrink-0 active:scale-95"
          >
            <div className="w-5 h-5 rounded-full overflow-hidden bg-[var(--brand-bg)]">
              {imgUrl ? (
                <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--brand-primary)]/10">
                  <svg className="w-3 h-3 text-[var(--brand-primary)]/30" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium text-[var(--brand-text)]">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
