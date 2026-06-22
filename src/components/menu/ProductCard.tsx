"use client";

import { Product } from "@/app/menu/page";

interface Props {
  product: Product;
  onAddToCart: (p: Product) => void;
  index: number;
  animItem?: number | null;
}

function getImageUrl(product: Product): string | null {
  if (!product.image_path) return null;
  if (product.image_path.startsWith("/uploads/")) return product.image_path;
  const filename = product.image_path.replace(/\\/g, "/").split("/").pop();
  if (filename) return `/uploads/catalog/${filename}`;
  return null;
}

export default function ProductCard({ product, onAddToCart, index, animItem }: Props) {
  const imgUrl = getImageUrl(product);
  const delay = Math.min(index % 5, 4);
  const isAdding = animItem === product.id;

  return (
    <div className={`menu-card animate-fade-up stagger-${delay + 1} ${isAdding ? "ring-2 ring-[var(--brand-primary)] ring-offset-2 scale-[1.02]" : ""} transition-all duration-300`}>
      <div className="aspect-[4/3] sm:aspect-square bg-[var(--brand-bg)] relative overflow-hidden rounded-t-xl">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              target.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-primary)]/10 ${imgUrl ? "hidden" : ""}`}>
          <div className="text-center px-2">
            <svg className="w-8 h-8 sm:w-12 sm:h-12 text-[var(--brand-primary)]/20 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[10px] sm:text-xs text-[var(--brand-text-muted)] mt-1.5 line-clamp-2">{product.name}</p>
          </div>
        </div>
        {product.category && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[9px] sm:text-[10px] font-medium text-[var(--brand-text-secondary)] shadow-sm">
            {product.category}
          </span>
        )}
        {isAdding && (
          <div className="absolute inset-0 bg-[var(--brand-primary)]/20 flex items-center justify-center animate-scale-in">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--brand-primary)] flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="p-2.5 sm:p-4">
        <div className="flex items-start justify-between gap-1.5 mb-0.5 sm:mb-1">
          <h3 className="text-xs sm:text-sm font-semibold text-[var(--brand-text)] leading-snug line-clamp-2">
            {product.name}
          </h3>
          <span className="text-xs sm:text-sm font-bold text-[var(--brand-primary)] whitespace-nowrap">
            ${product.price.toFixed(0)}
          </span>
        </div>
        {product.description && (
          <p className="text-[10px] sm:text-xs text-[var(--brand-text-secondary)] leading-relaxed mb-2 sm:mb-3 line-clamp-2">
            {product.description}
          </p>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          className="w-full py-2 sm:py-2.5 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-[10px] sm:text-xs font-semibold rounded-lg hover:bg-[var(--brand-primary)] hover:text-white transition-all active:scale-95"
        >
          + Agregar
        </button>
      </div>
    </div>
  );
}
