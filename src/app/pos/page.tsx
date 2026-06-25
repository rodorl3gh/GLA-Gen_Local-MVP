"use client";

import { useState, useEffect, useCallback } from "react";
import PosProductCard from "@/components/pos/PosProductCard";
import CustomizationModal, { CartItem } from "@/components/pos/CustomizationModal";
import PosCartPanel from "@/components/pos/PosCartPanel";
import CheckoutModal from "@/components/pos/CheckoutModal";
import FavoritesBar, { FavoriteItem } from "@/components/pos/FavoritesBar";

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_path: string;
  active: number;
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

const FAVORITES_KEY = "pos_favorites";
const CART_KEY = "pos_cart";
const GRID_COLS_KEY = "pos_grid_cols";
const MAX_FAVORITES = 5;

function loadFavorites(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveFavorites(items: FavoriteItem[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function loadGridCols(): number {
  try {
    const raw = localStorage.getItem(GRID_COLS_KEY);
    return raw ? Math.max(3, Math.min(8, parseInt(raw))) : 5;
  } catch { return 5; }
}

export function getImageUrl(img: string | undefined | null): string | null {
  if (!img) return null;
  if (img.startsWith("/uploads/")) return img;
  const filename = img.replace(/\\/g, "/").split("/").pop();
  if (filename) return `/uploads/catalog/${filename}`;
  return null;
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Todas");
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [gridCols, setGridCols] = useState(5);

  // Promo modal state
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const [promoSelections, setPromoSelections] = useState<Record<number, number>>({});
  const [promoSlotSelections, setPromoSlotSelections] = useState<Record<number, number>>({});

  // Load persisted state
  useEffect(() => {
    setFavorites(loadFavorites());
    const savedCart = loadCart();
    if (savedCart.length > 0) setCart(savedCart);
    setGridCols(loadGridCols());
  }, []);

  // Persist
  useEffect(() => { saveCart(cart); }, [cart]);
  useEffect(() => { saveFavorites(favorites); }, [favorites]);
  useEffect(() => {
    localStorage.setItem(GRID_COLS_KEY, String(gridCols));
  }, [gridCols]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog");
      const data = await res.json();
      if (Array.isArray(data)) {
        const active = data.filter((p: Product) => p.active !== 0);
        setProducts(active);
        const cats = ["Todas", ...Array.from(new Set(active.map((p: Product) => p.category || "General")))];
        setCategories(cats as string[]);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Fetch promotions
  useEffect(() => {
    fetch("/api/promotions")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPromotions(d); })
      .catch(() => {});
  }, []);

  // Storage events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === FAVORITES_KEY) setFavorites(loadFavorites());
      if (e.key === CART_KEY) setCart(loadCart());
      if (e.key === GRID_COLS_KEY) setGridCols(loadGridCols());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(fetchProducts, 30000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  // ── Favorites ──
  const toggleFavorite = (id: number, type: "product" | "promo") => {
    setFavorites(prev => {
      const exists = prev.some(f => f.id === id && f.type === type);
      if (exists) return prev.filter(f => !(f.id === id && f.type === type));
      if (prev.length >= MAX_FAVORITES) return prev;
      return [...prev, { id, type }];
    });
  };

  const isFavorite = (id: number, type: "product" | "promo"): boolean => {
    return favorites.some(f => f.id === id && f.type === type);
  };

  // ── Product selection ──
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setEditIndex(null);
    setShowCustomize(true);
  };

  // ── Add to cart ──
  const handleAddToCart = (item: CartItem) => {
    if (editIndex !== null) {
      setCart(prev => prev.map((ci, i) => i === editIndex ? item : ci));
      setEditIndex(null);
    } else {
      setCart(prev => [...prev, item]);
    }
  };

  // ── Edit item ──
  const handleEdit = (index: number) => {
    const item = cart[index];
    if (item.isPromo) return;
    const prod = products.find(p => p.id === item.id);
    if (!prod) return;
    setSelectedProduct(prod);
    setEditIndex(index);
    setShowCustomize(true);
  };

  // ── Cart ops ──
  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const updated = prev.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      );
      return updated.filter(item => item.quantity > 0);
    });
  };

  const removeItem = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));
  const resetCart = () => { if (cart.length > 0) setCart([]); };

  // ── Promo modal ──
  const openPromoModal = (promo: Promotion) => {
    setSelectedPromo(promo);
    setPromoSelections({});
    setPromoSlotSelections({});
    setShowPromoModal(true);
  };

  const addPromoToCart = () => {
    if (!selectedPromo) return;
    const cfg = selectedPromo.config || {};
    let subItems: { name: string; productId: number }[] = [];

    if (selectedPromo.type === "promotion") {
      const pickCount = cfg.pickCount || 2;
      const selected = Object.entries(promoSelections)
        .filter(([_, qty]) => qty > 0)
        .map(([prodId, qty]) => {
          const p = products.find(pr => pr.id === Number(prodId));
          return { name: p ? p.name : `Producto #${prodId}`, productId: Number(prodId), quantity: qty };
        });
      const totalPicked = selected.reduce((s, i) => s + i.quantity, 0);
      if (totalPicked < pickCount) return;
      subItems = selected.flatMap(s => Array(s.quantity).fill({ name: s.name, productId: s.productId }));
    } else if (selectedPromo.type === "package") {
      const slots = cfg.slots || [];
      const allFilled = slots.every((slot: any) => {
        const sel = promoSlotSelections[slots.indexOf(slot)] ?? promoSlotSelections[slot.label as any];
        return sel !== undefined && sel > 0;
      });
      if (!allFilled) return;
      slots.forEach((slot: any, idx: number) => {
        const prodId = promoSlotSelections[idx] || promoSlotSelections[slot.label as any];
        if (prodId) {
          const p = products.find(pr => pr.id === prodId);
          subItems.push({ name: p ? p.name : slot.label, productId: prodId });
        }
      });
    }

    setCart(prev => [...prev, {
      id: -(selectedPromo.id + 10000),
      name: selectedPromo.name,
      price: selectedPromo.price,
      quantity: 1,
      notes: "",
      image_path: selectedPromo.image_path,
      category: selectedPromo.type === "promotion" ? "Promocion" : "Paquete",
      isPromo: true,
      promoSubItems: subItems,
    }]);
    setShowPromoModal(false);
    setSelectedPromo(null);
  };

  const promoProduct = (id: number) => products.find(p => p.id === id);

  // ── Filter products ──
  const filteredProducts = activeCategory === "Todas"
    ? products
    : products.filter(p => (p.category || "General") === activeCategory);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // ── Render ──
  return (
    <div className="h-screen flex flex-col bg-[var(--brand-bg)] overflow-hidden">
      {/* Top Header */}
      <header className="flex-shrink-0 px-4 sm:px-6 py-2 bg-white border-b border-[var(--brand-border)]">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-bold text-[var(--brand-text)]">
            Punto de Venta <span className="text-[var(--brand-text-muted)] font-normal">| Cafeteria Luna</span>
          </h1>
          <a href="/admin"
            className="text-[10px] font-medium text-[var(--brand-text-muted)] hover:text-[var(--brand-primary)] transition-colors">
            Admin
          </a>
        </div>
        {/* Favorites bar */}
        <div className="mt-1.5">
          <FavoritesBar
            favorites={favorites}
            products={products}
            promotions={promotions}
            gridCols={gridCols}
            onSelectProduct={handleSelectProduct}
            onSelectPromo={openPromoModal}
          />
        </div>
      </header>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Product grid (left) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Category tabs */}
          <div className="flex-shrink-0 px-4 sm:px-6 py-2 bg-white border-b border-[var(--brand-border)] overflow-x-auto">
            <div className="flex items-center gap-1.5">
              {/* Size slider — contrasting */}
              <div className="flex items-center gap-1.5 pr-2 mr-1 border-r border-[var(--brand-border)] flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <input
                  type="range"
                  min="3"
                  max="8"
                  value={gridCols}
                  onChange={(e) => setGridCols(parseInt(e.target.value))}
                  className="w-16 h-1.5 bg-[var(--brand-primary)]/20 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "var(--brand-primary)" }}
                  title="Tamaño de productos"
                />
                <span className="text-[10px] font-semibold text-[var(--brand-primary)] min-w-[10px]">{gridCols}</span>
              </div>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat ? "bg-[var(--brand-primary)] text-white shadow-sm" : "bg-gray-100 text-[var(--brand-text-secondary)] hover:bg-gray-200"
                  }`}>{cat}</button>
              ))}
            </div>
          </div>

          {/* Scrollable product area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Products grid — using inline style for dynamic columns since Tailwind can't do dynamic grid classes */}
            <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
              {filteredProducts.map(product => (
                <PosProductCard
                  key={product.id}
                  product={product}
                  isFavorite={isFavorite(product.id, "product")}
                  onToggleFavorite={(id) => toggleFavorite(id, "product")}
                  onSelect={handleSelectProduct}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-[var(--brand-text-muted)]">No hay productos en esta categoria</p>
              </div>
            )}

            {/* Promotions section */}
            {promotions.length > 0 && (
              <div className="mt-8">
                <div className="mb-4">
                  <h2 className="text-xs font-bold text-[var(--brand-text)] uppercase tracking-[0.15em]">Ofertas y Paquetes</h2>
                  <div className="w-8 h-0.5 bg-[var(--brand-primary)] mt-1 rounded-full" />
                </div>
                <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                  {promotions.map(promo => (
                    <div key={promo.id} className="relative">
                      <button
                        onClick={() => openPromoModal(promo)}
                        className="w-full text-left glass-card overflow-hidden hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer group"
                      >
                        <div className="aspect-[4/3] bg-[var(--brand-bg)] overflow-hidden relative">
                          {promo.image_path ? (
                            <img src={getImageUrl(promo.image_path) || ""} alt={promo.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-primary)]/10">
                              <svg className="w-8 h-8 text-[var(--brand-primary)]/20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                              </svg>
                            </div>
                          )}
                          <span className={`absolute top-1 left-1 text-[7px] px-1 py-0.5 rounded-full font-medium ${
                            promo.type === "promotion" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                          }`}>
                            {promo.type === "promotion" ? "Promo" : "Paquete"}
                          </span>
                        </div>
                        <div className="p-2.5">
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="text-xs font-semibold text-[var(--brand-text)] leading-snug">{promo.name}</h3>
                            <span className="text-sm font-bold text-[var(--brand-primary)]">${promo.price.toFixed(0)}</span>
                          </div>
                        </div>
                      </button>
                      {/* Favorite toggle for promos */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(promo.id, "promo"); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all z-10"
                        title={isFavorite(promo.id, "promo") ? "Quitar de favoritos" : "Agregar a favoritos"}
                      >
                        <svg className={`w-3.5 h-3.5 ${isFavorite(promo.id, "promo") ? "text-yellow-500 fill-yellow-500" : "text-gray-400"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cart panel (right) */}
        <div className="w-[22rem] flex-shrink-0">
          <PosCartPanel
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onEdit={handleEdit}
            onRemove={removeItem}
            onReset={resetCart}
            onCheckout={() => setShowCheckout(true)}
          />
        </div>
      </div>

      {/* Customization Modal */}
      <CustomizationModal
        product={selectedProduct || { id: 0, name: "", description: "", price: 0, category: "", image_path: "", active: 1 }}
        open={showCustomize && !!selectedProduct}
        onClose={() => { setShowCustomize(false); setSelectedProduct(null); setEditIndex(null); }}
        onAdd={handleAddToCart}
      />

      {/* Checkout Modal (with pre-ticket + ticket) */}
      <CheckoutModal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        cart={cart}
        total={cartTotal}
        onSuccess={() => {
          setShowCheckout(false);
          setCart([]);
        }}
      />

      {/* Promo Selection Modal */}
      {showPromoModal && selectedPromo && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowPromoModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-[var(--brand-border)] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--brand-text)]">{selectedPromo.name}</h2>
                  <p className="text-[10px] text-[var(--brand-text-muted)]">
                    {selectedPromo.type === "promotion" ? "Selecciona tus productos" : "Elige una opcion por categoria"}
                  </p>
                </div>
                <button onClick={() => setShowPromoModal(false)} className="p-1.5 rounded-xl hover:bg-gray-50">
                  <svg className="w-5 h-5 text-[var(--brand-text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4 space-y-4">
                {selectedPromo.type === "promotion" && (() => {
                  const cfg = selectedPromo.config || {};
                  const pickCount = cfg.pickCount || 2;
                  const payCount = cfg.payCount || 1;
                  const eligibleIds: number[] = cfg.eligibleProductIds || [];
                  const picked = Object.values(promoSelections).reduce((s, q) => s + q, 0);
                  return (
                    <>
                      <p className="text-xs text-[var(--brand-text-secondary)]">
                        Elige <strong>{pickCount}</strong> productos y paga solo <strong>{payCount}</strong>
                        {picked > 0 && <span className="text-[var(--brand-primary)]"> — {picked} de {pickCount} seleccionados</span>}
                      </p>
                      <div className="space-y-2">
                        {eligibleIds.map(pid => {
                          const p = promoProduct(pid);
                          if (!p) return null;
                          const qty = promoSelections[pid] || 0;
                          const maxReached = picked >= pickCount;
                          return (
                            <div key={pid} className="flex items-center justify-between p-3 rounded-xl border border-[var(--brand-border)] bg-gray-50">
                              <div><p className="text-sm font-medium text-[var(--brand-text)]">{p.name}</p><p className="text-[10px] text-[var(--brand-text-muted)]">{p.category}</p></div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setPromoSelections(prev => ({ ...prev, [pid]: Math.max(0, (prev[pid] || 0) - 1) }))} disabled={qty === 0}
                                  className="w-7 h-7 rounded-lg border border-[var(--brand-border)] flex items-center justify-center text-sm disabled:opacity-30">-</button>
                                <span className="w-5 text-center text-sm font-medium">{qty}</span>
                                <button onClick={() => setPromoSelections(prev => ({ ...prev, [pid]: (prev[pid] || 0) + 1 }))} disabled={maxReached}
                                  className="w-7 h-7 rounded-lg border border-[var(--brand-border)] flex items-center justify-center text-sm disabled:opacity-30">+</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}

                {selectedPromo.type === "package" && (() => {
                  const cfg = selectedPromo.config || {};
                  const slots: any[] = cfg.slots || [];
                  return (
                    <div className="space-y-4">
                      {slots.map((slot: any, idx: number) => {
                        const eligibleIds: number[] = slot.eligibleProductIds || [];
                        const selectedId = promoSlotSelections[idx];
                        return (
                          <div key={idx}>
                            <p className="text-[10px] font-semibold text-[var(--brand-text-muted)] uppercase tracking-wider mb-2">{slot.label}</p>
                            <div className="space-y-1">
                              {eligibleIds.map(pid => {
                                const p = promoProduct(pid);
                                if (!p) return null;
                                const isSelected = selectedId === pid;
                                return (
                                  <button key={pid} onClick={() => setPromoSlotSelections(prev => ({ ...prev, [idx]: pid }))}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                                      isSelected ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5" : "border-[var(--brand-border)] bg-gray-50 hover:border-[var(--brand-primary-light)]"
                                    }`}>
                                    <div><p className="text-sm font-medium text-[var(--brand-text)]">{p.name}</p><p className="text-[10px] text-[var(--brand-text-muted)]">{p.category}</p></div>
                                    {isSelected && <svg className="w-5 h-5 text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div className="border-t border-[var(--brand-border)] pt-4 flex items-center justify-between">
                  <span className="text-xs text-[var(--brand-text-secondary)]">Precio del {selectedPromo.type === "promotion" ? "promocion" : "paquete"}</span>
                  <span className="text-xl font-bold text-[var(--brand-primary)]">${selectedPromo.price.toFixed(0)}</span>
                </div>
                <button onClick={addPromoToCart}
                  className="w-full py-2.5 bg-[var(--brand-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--brand-primary-dark)] transition-all active:scale-[0.98]">
                  Agregar al Pedido
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
