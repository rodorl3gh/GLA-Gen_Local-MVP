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
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
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
          i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

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

      {/* Promotions & Packages Slideshow */}
      {promotions.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-[var(--brand-text)] uppercase tracking-[0.2em] mb-2">Ofertas y Paquetes</h2>
            <div className="w-12 h-0.5 bg-[var(--brand-primary)] mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {promotions.map((promo) => (
              <div key={promo.id}
                className="glass-card overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                onClick={() => setShowCart(true)}>
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
    </div>
  );
}
