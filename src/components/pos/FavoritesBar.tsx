"use client";

import { Product } from "@/app/pos/page";
import { useMemo } from "react";

export interface FavoriteItem {
  id: number;
  type: "product" | "promo";
}

interface Promotion {
  id: number;
  name: string;
  description: string;
  price: number;
  type: "promotion" | "package";
  image_path: string;
  active: number;
  details: string[];
  config: any;
}

interface Props {
  favorites: FavoriteItem[];
  products: Product[];
  promotions: Promotion[];
  gridCols: number;
  onSelectProduct: (product: Product) => void;
  onSelectPromo: (promo: Promotion) => void;
}

export function getImageUrl(img: string | undefined | null): string | null {
  if (!img) return null;
  if (img.startsWith("/uploads/")) return img;
  const filename = img.replace(/\\/g, "/").split("/").pop();
  if (filename) return `/uploads/catalog/${filename}`;
  return null;
}

export default function FavoritesBar({ favorites, products, promotions, gridCols, onSelectProduct, onSelectPromo }: Props) {
  const items = useMemo(() => {
    return favorites.map(fav => {
      if (fav.type === "product") {
        const p = products.find(pr => pr.id === fav.id);
        return p ? { ...p, _type: "product" as const, _promoType: null as string | null } : null;
      }
      const promo = promotions.find(pr => pr.id === fav.id);
      return promo ? { id: promo.id, name: promo.name, price: promo.price, category: promo.type === "promotion" ? "Promocion" : "Paquete", image_path: promo.image_path, description: "", active: 1, _type: "promo" as const, _promoType: promo.type } : null;
    }).filter(Boolean) as any[];
  }, [favorites, products, promotions]);

  if (items.length === 0) return null;

  const cardWidth = Math.max(80, Math.min(160, Math.round(500 / gridCols)));

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-start gap-2">
        {items.map(item => {
          const imgUrl = getImageUrl(item.image_path);
          return (
            <button
              key={`${item._type}-${item.id}`}
              onClick={() => item._type === "promo" ? onSelectPromo(promotions.find(p => p.id === item.id)!) : onSelectProduct(products.find(p => p.id === item.id)!)}
              className="flex-shrink-0 text-left glass-card overflow-hidden hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ width: `${cardWidth}px` }}
            >
              <div className="aspect-[4/3] bg-[var(--brand-bg)] overflow-hidden relative">
                {imgUrl ? (
                  <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-100 to-yellow-50">
                    <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                )}
                {item._type === "promo" && (
                  <span className={`absolute top-1 left-1 text-[7px] px-1 py-0.5 rounded-full font-medium ${
                    item._promoType === "promotion" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                  }`}>
                    {item._promoType === "promotion" ? "Promo" : "Paquete"}
                  </span>
                )}
              </div>
              <div className="p-2">
                <div className="flex items-start justify-between gap-1">
                  <h3 className="text-[9px] font-semibold text-[var(--brand-text)] leading-snug line-clamp-2">{item.name}</h3>
                  <span className="text-[10px] font-bold text-[var(--brand-primary)] whitespace-nowrap">${item.price.toFixed(0)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
