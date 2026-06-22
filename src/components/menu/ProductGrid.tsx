"use client";

import { Product } from "@/app/menu/page";
import ProductCard from "./ProductCard";

interface Props {
  products: Product[];
  onAddToCart: (p: Product) => void;
  animItem?: number | null;
}

export default function ProductGrid({ products, onAddToCart, animItem }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--brand-bg)] flex items-center justify-center">
          <svg className="w-10 h-10 text-[var(--brand-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-[var(--brand-text-secondary)] text-sm">No se encontraron productos</p>
        <p className="text-[var(--brand-text-muted)] text-xs mt-1">Intenta con otra búsqueda o categoría</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {products.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          index={i}
          animItem={animItem}
        />
      ))}
    </div>
  );
}
