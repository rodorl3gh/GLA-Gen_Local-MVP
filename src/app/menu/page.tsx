"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/menu/Header";
import HeroSection from "@/components/menu/HeroSection";
import CategoryTabs from "@/components/menu/CategoryTabs";
import ProductGrid from "@/components/menu/ProductGrid";
import CartDrawer from "@/components/menu/CartDrawer";
import CheckoutForm from "@/components/menu/CheckoutForm";

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_path: string;
  active: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  isPromo?: boolean;
  promoSubItems?: { name: string; productId: number }[];
}

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [search, setSearch] = useState("");
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [animItem, setAnimItem] = useState<number | null>(null);
  const [promotions, setPromotions] = useState<any[]>([]);

  // Promo modal state
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<any>(null);
  const [promoSelections, setPromoSelections] = useState<Record<number, number>>({});
  const [promoSlotSelections, setPromoSlotSelections] = useState<Record<number, number>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mesa = params.get("mesa");
    if (mesa) setTableNumber(parseInt(mesa) || null);
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data.filter((p: Product) => p.active !== 0));
        const cats = Array.from(new Set(data.map((p: Product) => p.category || "General")));
        setCategories(cats as string[]);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    fetch("/api/promotions")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPromotions(d); })
      .catch(() => {});
  }, []);

  const filtered = activeCategory
    ? products.filter((p) => (p.category || "General") === activeCategory)
    : products;

  const searched = search
    ? filtered.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      )
    : filtered;

  const addToCart = (product: Product) => {
    setAnimItem(product.id);
    setTimeout(() => setAnimItem(null), 600);
    setCart((prev) => {
      const existing = prev.find((i) => !i.isPromo && i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          !i.isPromo && i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setShowCart(true);
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.isPromo ? i : i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

  // Promo modal handlers
  const openPromoModal = (promo: any) => {
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
      if (totalPicked < pickCount) return; // not enough selections

      subItems = selected.flatMap(s => Array(s.quantity).fill({ name: s.name, productId: s.productId }));
    } else if (selectedPromo.type === "package") {
      const slots = cfg.slots || [];
      const allFilled = slots.every((slot: any) => {
        const sel = promoSlotSelections[slot.label as any] ?? promoSlotSelections[slots.indexOf(slot)];
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
      product: {
        id: -(selectedPromo.id + 10000),
        name: selectedPromo.name,
        description: selectedPromo.description,
        price: selectedPromo.price,
        category: selectedPromo.type === "promotion" ? "Promocion" : "Paquete",
        image_path: selectedPromo.image_path,
        active: 1,
      },
      quantity: 1,
      isPromo: true,
      promoSubItems: subItems,
    }]);

    setShowPromoModal(false);
    setSelectedPromo(null);
    setShowCart(true);
  };

  const promoProduct = (id: number) => products.find(p => p.id === id);

  return (
    <div className="min-h-screen bg-[var(--brand-bg)]">
      <Header
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        onCartClick={() => setShowCart(true)}
        search={search}
        onSearchChange={setSearch}
        cartHighlight={showCart}
      />

      <HeroSection />

      {/* Promotions & Packages */}
      {promotions.length > 0 && (
        <div className={`transition-all duration-300 ${showCart ? "md:mr-[28rem]" : "mr-0"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-[var(--brand-text)] uppercase tracking-[0.2em] mb-2">Ofertas y Paquetes</h2>
            <div className="w-12 h-0.5 bg-[var(--brand-primary)] mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {promotions.map((promo) => (
              <div key={promo.id}
                className="glass-card overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                onClick={() => openPromoModal(promo)}>
                <div className="aspect-[4/3] bg-[var(--brand-bg)] flex items-center justify-center overflow-hidden">
                  {promo.image_path ? (
                    <img src={promo.image_path} alt={promo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <svg className="w-10 h-10 text-[var(--brand-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      promo.type === "promotion"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-sky-100 text-sky-700"
                    }`}>
                      {promo.type === "promotion" ? "Promocion" : "Paquete"}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--brand-text)] mb-1">{promo.name}</h3>
                  <p className="text-xs text-[var(--brand-text-secondary)] line-clamp-2 mb-2">{promo.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[var(--brand-primary)]">${promo.price.toFixed(0)}</span>
                    {promo.details?.length > 0 && (
                      <ul className="text-[10px] text-[var(--brand-text-muted)] space-y-0.5">
                        {promo.details.slice(0, 2).map((d: string, i: number) => (
                          <li key={i} className="flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-[var(--brand-primary)]" />{d}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      <main className={`transition-all duration-300 ${showCart ? "md:mr-[28rem]" : "mr-0"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
          <CategoryTabs
            categories={categories}
            active={activeCategory}
            onChange={setActiveCategory}
          />

          <ProductGrid
            products={searched}
            onAddToCart={addToCart}
            animItem={animItem}
          />
        </div>
      </main>

      <CartDrawer
        open={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        total={total}
        onCheckout={() => {
          setShowCart(false);
          setShowCheckout(true);
        }}
      />

      <CheckoutForm
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        cart={cart}
        total={total}
        tableNumber={tableNumber}
        onSuccess={() => {
          setCart([]);
        }}
      />

      {/* Promo Selection Modal */}
      {showPromoModal && selectedPromo && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setShowPromoModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-[var(--brand-border)] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[var(--brand-text)]">{selectedPromo.name}</h2>
                  <p className="text-xs text-[var(--brand-text-muted)]">
                    {selectedPromo.type === "promotion" ? "Selecciona tus productos" : "Elige una opcion por categoria"}
                  </p>
                </div>
                <button onClick={() => setShowPromoModal(false)} className="p-1.5 rounded-xl hover:bg-gray-50">
                  <svg className="w-5 h-5 text-[var(--brand-text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-4">
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
                              <div>
                                <p className="text-sm font-medium text-[var(--brand-text)]">{p.name}</p>
                                <p className="text-[10px] text-[var(--brand-text-muted)]">{p.category}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setPromoSelections(prev => ({ ...prev, [pid]: Math.max(0, (prev[pid] || 0) - 1) }))}
                                  disabled={qty === 0}
                                  className="w-7 h-7 rounded-lg border border-[var(--brand-border)] flex items-center justify-center text-sm disabled:opacity-30">-</button>
                                <span className="w-5 text-center text-sm font-medium">{qty}</span>
                                <button onClick={() => setPromoSelections(prev => ({ ...prev, [pid]: (prev[pid] || 0) + 1 }))}
                                  disabled={maxReached}
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
                            <p className="text-xs font-semibold text-[var(--brand-text-secondary)] uppercase tracking-wider mb-2">
                              {slot.label}
                            </p>
                            <div className="space-y-1">
                              {eligibleIds.map(pid => {
                                const p = promoProduct(pid);
                                if (!p) return null;
                                const isSelected = selectedId === pid;
                                return (
                                  <button key={pid} onClick={() => setPromoSlotSelections(prev => ({ ...prev, [idx]: pid }))}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                                      isSelected
                                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                                        : "border-[var(--brand-border)] bg-gray-50 hover:border-[var(--brand-primary-light)]"
                                    }`}>
                                    <div>
                                      <p className="text-sm font-medium text-[var(--brand-text)]">{p.name}</p>
                                      <p className="text-[10px] text-[var(--brand-text-muted)]">{p.category}</p>
                                    </div>
                                    {isSelected && (
                                      <svg className="w-5 h-5 text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
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
                  <span className="text-sm text-[var(--brand-text-secondary)]">Precio del {selectedPromo.type === "promotion" ? "promocion" : "paquete"}</span>
                  <span className="text-xl font-bold text-[var(--brand-primary)]">${selectedPromo.price.toFixed(0)}</span>
                </div>

                <button onClick={addPromoToCart}
                  className="btn-primary w-full py-3 text-sm font-semibold">
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
