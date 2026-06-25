"use client";

import { Product } from "@/app/pos/page";
import { useMemo } from "react";

interface Props {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
  onSelect: (product: Product) => void;
}

export default function PosProductCard({ product, isFavorite, onToggleFavorite, onSelect }: Props) {
  const imgUrl = useMemo(() => {
    if (!product.image_path) return null;
    if (product.image_path.startsWith("/uploads/")) return product.image_path;
    const filename = product.image_path.replace(/\\/g, "/").split("/").pop();
    if (filename) return `/uploads/catalog/${filename}`;
    return null;
  }, [product.image_path]);

  return (
    <button
      onClick={() => onSelect(product)}
      className="relative w-full text-left glass-card overflow-hidden hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer group"
    >
      <div className="aspect-[4/3] bg-[var(--brand-bg)] relative overflow-hidden">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-primary)]/10">
            <svg className="w-8 h-8 text-[var(--brand-primary)]/20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Favorite toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all z-10"
          title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <svg className={`w-3.5 h-3.5 ${isFavorite ? "text-yellow-500 fill-yellow-500" : "text-gray-400"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      </div>
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1">
          <h3 className="text-xs font-semibold text-[var(--brand-text)] leading-snug line-clamp-2">{product.name}</h3>
          <span className="text-sm font-bold text-[var(--brand-primary)] whitespace-nowrap">${product.price.toFixed(0)}</span>
        </div>
        {product.category && (
          <span className="text-[9px] text-[var(--brand-text-muted)] mt-0.5 block">{product.category}</span>
        )}
      </div>
    </button>
  );
}
