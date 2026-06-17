"use client";

import { useState, useEffect, useCallback } from "react";
import AdminSidebar from "@/components/admin/Sidebar";

interface Product {
  id: number; name: string; description: string; price: number;
  category: string; image_path: string; active: number;
}

type ViewMode = "grid" | "list";

function getImageUrl(p: Product): string | null {
  if (!p.image_path) return null;
  if (p.image_path.startsWith("/uploads/")) return p.image_path;
  const filename = p.image_path.replace(/\\/g, "/").split("/").pop();
  if (filename) return `/uploads/catalog/${filename}`;
  return null;
}

export default function AdminProducts() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [gridCols, setGridCols] = useState(4);
  const [sectionType, setSectionType] = useState<"products" | "promotions" | "packages">("products");
  const [promos, setPromos] = useState<any[]>([]);

  // Promo/package form state
  const [promoForm, setPromoForm] = useState(false);
  const [editPromo, setEditPromo] = useState<any>(null);
  const [promoName, setPromoName] = useState("");
  const [promoDesc, setPromoDesc] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [promoDetails, setPromoDetails] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoPickCount, setPromoPickCount] = useState(2);
  const [promoPayCount, setPromoPayCount] = useState(1);
  const [promoSelectedProds, setPromoSelectedProds] = useState<number[]>([]);
  const [promoSlots, setPromoSlots] = useState<{ label: string; eligibleIds: number[] }[]>([]);

  const fetchProducts = useCallback(async () => {
    try { const res = await fetch("/api/catalog"); const data = await res.json(); if (Array.isArray(data)) setProducts(data); } catch {}
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const fetchPromos = useCallback(async () => {
    try { const res = await fetch("/api/promotions"); const data = await res.json(); if (Array.isArray(data)) setPromos(data); } catch {}
  }, []);

  useEffect(() => { fetchPromos(); }, [fetchPromos]);

  const resetPromoForm = () => {
    setPromoName(""); setPromoDesc(""); setPromoPrice(""); setPromoDetails("");
    setPromoPickCount(2); setPromoPayCount(1); setPromoSelectedProds([]);
    setPromoSlots([]); setEditPromo(null); setPromoForm(false);
  };

  const startEditPromo = (p: any) => {
    setPromoName(p.name); setPromoDesc(p.description); setPromoPrice(String(p.price));
    setPromoDetails((p.details || []).join("\n"));
    const cfg = p.config || {};
    if (p.type === "promotion") {
      setPromoPickCount(cfg.pickCount || 2);
      setPromoPayCount(cfg.payCount || 1);
      setPromoSelectedProds(cfg.eligibleProductIds || []);
      setPromoSlots([]);
    } else {
      setPromoSlots((cfg.slots || []).map((s: any) => ({ label: s.label, eligibleIds: s.eligibleProductIds || [] })));
      setPromoSelectedProds([]);
    }
    setEditPromo(p); setPromoForm(true);
  };

  const handlePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoName.trim()) return;
    setPromoLoading(true);

    const config = sectionType === "packages"
      ? { slots: promoSlots.map(s => ({ label: s.label, eligibleProductIds: s.eligibleIds, required: true, maxSelect: 1 })) }
      : { pickCount: promoPickCount, payCount: promoPayCount, eligibleProductIds: promoSelectedProds };

    const body: any = {
      name: promoName.trim(),
      description: promoDesc.trim(),
      price: Number(promoPrice) || 0,
      type: sectionType === "packages" ? "package" : "promotion",
      details: promoDetails.split("\n").map(l => l.trim()).filter(Boolean),
      config,
    };

    try {
      if (editPromo) {
        await fetch(`/api/promotions/${editPromo.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/promotions", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
      }
      resetPromoForm(); fetchPromos();
    } catch {}
    setPromoLoading(false);
  };

  const handleDeletePromo = async (id: number) => {
    if (!confirm("Eliminar este elemento?")) return;
    await fetch(`/api/promotions/${id}`, { method: "DELETE" });
    fetchPromos();
  };

  const resetForm = () => {
    setName(""); setDesc(""); setPrice(""); setCategory(""); setImage(null);
    setEditing(null); setShowForm(false);
  };

  const startEdit = (p: Product) => {
    setName(p.name); setDesc(p.description); setPrice(String(p.price)); setCategory(p.category);
    setImage(null); setEditing(p); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("name", name); fd.append("description", desc); fd.append("price", price || "0"); fd.append("category", category);
    if (image) fd.append("image", image);
    try {
      if (editing) { await fetch(`/api/catalog/${editing.id}`, { method: "PUT", body: fd }); }
      else { await fetch("/api/catalog", { method: "POST", body: fd }); }
      resetForm(); fetchProducts();
    } catch {}
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Desactivar este producto?")) return;
    await fetch(`/api/catalog/${id}`, { method: "DELETE" });
    fetchProducts();
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = filterCategory ? products.filter(p => p.category === filterCategory) : products;

  const renderGridCard = (p: Product) => {
    const imgUrl = getImageUrl(p);
    return (
      <div key={p.id}
        className={`rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] overflow-hidden transition-all ${p.active === 0 ? "opacity-40" : "hover:border-[#c07a5b]/30 hover:bg-[var(--admin-bg-hover)]"}`}>
        <div className="aspect-square bg-[var(--admin-bg)] flex items-center justify-center overflow-hidden">
          {imgUrl ? (
            <img src={imgUrl} alt={p.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="text-center p-4">
              <svg className="w-10 h-10 text-[var(--admin-border)] mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-[10px] text-[var(--admin-placeholder)] mt-1 truncate">{p.name}</p>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-sm font-medium text-[var(--admin-text)] truncate flex-1">{p.name}</h3>
            <span className="text-sm font-bold text-[var(--admin-accent)] ml-2">${p.price.toFixed(0)}</span>
          </div>
          {p.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--admin-accent)]/15 text-[var(--admin-accent)] inline-block mb-2">{p.category}</span>
          )}
          {p.description && (
            <p className="text-xs text-[var(--admin-text-secondary)] mb-3 line-clamp-2">{p.description}</p>
          )}
          <div className="flex gap-1">
            <button onClick={() => startEdit(p)} className="flex-1 py-1.5 text-[11px] bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] rounded-lg hover:bg-[var(--admin-bg-tertiary)] hover:text-[var(--admin-text)] hover:border-[var(--admin-border-hover)] transition-all">Editar</button>
            <button onClick={() => handleDelete(p.id)} className="px-3 py-1.5 text-[11px] bg-red-500/5 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 transition-all">Eliminar</button>
          </div>
        </div>
      </div>
    );
  };

  const renderListRow = (p: Product) => {
    const imgUrl = getImageUrl(p);
    return (
      <div key={p.id}
        className={`flex items-center gap-4 p-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] transition-all ${p.active === 0 ? "opacity-40" : "hover:border-[#c07a5b]/30 hover:bg-[var(--admin-bg-hover)]"}`}>
        <div className="w-12 h-12 rounded-xl bg-[var(--admin-bg)] flex items-center justify-center overflow-hidden shrink-0 border border-[var(--admin-border)]">
          {imgUrl ? (
            <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" />
          ) : (
             <svg className="w-5 h-5 text-[var(--admin-border)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
             </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--admin-text)] truncate">{p.name}</span>
            {p.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--admin-accent)]/15 text-[var(--admin-accent)] shrink-0">{p.category}</span>
            )}
          </div>
          {p.description && (
            <p className="text-xs text-[var(--admin-text-secondary)] line-clamp-1 mt-0.5">{p.description}</p>
          )}
        </div>
        <span className="text-sm font-bold text-[var(--admin-accent)] shrink-0 w-16 text-right">${p.price.toFixed(0)}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${p.active === 1 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
          {p.active === 1 ? "Activo" : "Inactivo"}
        </span>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => startEdit(p)} className="px-3 py-1.5 text-[11px] bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] rounded-lg hover:bg-[var(--admin-bg-tertiary)] hover:text-[var(--admin-text)] hover:border-[var(--admin-border-hover)] transition-all">Editar</button>
          <button onClick={() => handleDelete(p.id)} className="px-3 py-1.5 text-[11px] bg-red-500/5 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 transition-all">Eliminar</button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[var(--admin-bg)]">
      <AdminSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <button onClick={() => setSidebarOpen(true)}
          className="md:hidden mb-4 w-10 h-10 rounded-xl bg-[var(--admin-bg-secondary)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--admin-text)]">Productos</h1>
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
              {sectionType === "products" ? `${products.length} productos · ${filtered.length} visibles` : sectionType === "promotions" ? `${promos.filter((p: any) => p.type === 'promotion').length} promociones` : `${promos.filter((p: any) => p.type === 'package').length} paquetes`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {categories.length > 0 && (
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] text-xs text-[var(--admin-text-secondary)] focus:outline-none focus:border-[var(--admin-accent)]/50">
                <option value="">Todas las categorias</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {/* View toggle */}
            <div className="flex bg-[var(--admin-bg-secondary)] border border-[var(--admin-border)] rounded-xl p-1">
              <button onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-[var(--admin-accent)]/15 text-[var(--admin-accent)]" : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]"}`}
                title="Vista cuadricula">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </button>
              <button onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-[var(--admin-accent)]/15 text-[var(--admin-accent)]" : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]"}`}
                title="Vista lista">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 bg-[var(--admin-accent)] text-white text-sm rounded-xl hover:bg-[var(--admin-accent-hover)] transition-all font-medium shadow-[0_2px_8px_rgba(192,122,91,0.2)] hover:shadow-[0_4px_16px_rgba(192,122,91,0.3)]">
              + Nuevo Producto
            </button>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mb-5 bg-[var(--admin-bg-secondary)] border border-[var(--admin-border)] rounded-xl p-1 w-fit">
          {[
            { k: "products" as const, label: "Productos", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
            { k: "promotions" as const, label: "Promociones", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { k: "packages" as const, label: "Paquetes", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
          ].map(t => (
            <button key={t.k} onClick={() => setSectionType(t.k)}
              className={`flex items-center gap-2 px-4 py-2 text-xs rounded-lg transition-all ${
                sectionType === t.k
                  ? "bg-[var(--admin-accent)] text-white font-medium"
                  : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]"
              }`}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>

        {/* Promotions / Packages view */}
        {sectionType !== "products" && (<>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[var(--admin-text-muted)]">
              {promos.filter((p: any) => sectionType === "promotions" ? p.type === "promotion" : p.type === "package").length} {sectionType === "promotions" ? "promociones" : "paquetes"}
            </p>
            <button onClick={() => { resetPromoForm(); setPromoForm(true); }}
              className="px-4 py-2 bg-[var(--admin-accent)] text-white text-sm rounded-xl hover:bg-[var(--admin-accent-hover)] transition-all font-medium">
              + Nuevo {sectionType === "promotions" ? "Promocion" : "Paquete"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {promos.filter((p: any) => sectionType === "promotions" ? p.type === "promotion" : p.type === "package").map((promo: any) => (
              <div key={promo.id} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] overflow-hidden hover:border-[var(--admin-accent)]/30 transition-all">
                <div className="aspect-[4/3] bg-[var(--admin-bg)] flex items-center justify-center overflow-hidden">
                  {promo.image_path ? (
                    <img src={promo.image_path} alt={promo.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <svg className="w-12 h-12 text-[var(--admin-border)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      promo.type === "promotion" ? "bg-amber-500/10 text-amber-400" : "bg-sky-500/10 text-sky-400"
                    }`}>
                      {promo.type === "promotion" ? "Promocion" : "Paquete"}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-1">{promo.name}</h3>
                  <p className="text-xs text-[var(--admin-text-secondary)] mb-3 line-clamp-2">{promo.description}</p>
                  {promo.details?.length > 0 && (
                    <ul className="text-[10px] text-[var(--admin-text-muted)] space-y-1 mb-3">
                      {promo.details.map((d: string, i: number) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-[var(--admin-accent)] shrink-0" />{d}
                        </li>
                      ))}
                    </ul>
                  )}
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[var(--admin-accent)]">${promo.price.toFixed(0)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${promo.active === 1 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                  {promo.active === 1 ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="flex gap-1 mt-3">
                <button onClick={() => startEditPromo(promo)} className="flex-1 py-1.5 text-[11px] bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] rounded-lg hover:bg-[var(--admin-bg-tertiary)] hover:text-[var(--admin-text)] transition-all">Editar</button>
                <button onClick={() => handleDeletePromo(promo.id)} className="px-3 py-1.5 text-[11px] bg-red-500/5 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 transition-all">Eliminar</button>
              </div>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {/* Products view (existing) */}
        <div className={sectionType === "products" ? "" : "hidden"}>
        {viewMode === "grid" && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider shrink-0">Columnas</span>
            <input
              type="range"
              min="2"
              max="6"
              value={gridCols}
              onChange={(e) => setGridCols(Number(e.target.value))}
              className="w-40 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--admin-accent) 0%, var(--admin-accent) ${((gridCols - 2) / 4) * 100}%, var(--admin-border) ${((gridCols - 2) / 4) * 100}%, var(--admin-border) 100%)`,
                accentColor: "#c07a5b",
              }}
            />
            <span className="text-xs font-mono text-[var(--admin-accent)] w-5">{gridCols}</span>
          </div>
        )}

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[var(--admin-bg-secondary)] border border-[var(--admin-border)] rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-scale-in">
              <h2 className="text-sm font-semibold text-[var(--admin-text)] mb-4">{editing ? "Editar Producto" : "Nuevo Producto"}</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Nombre *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Precio ($)</label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} step="0.01"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Descripcion</label>
                  <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20 transition-all resize-none" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Categoria</label>
                  <input type="text" value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20 transition-all"
                    placeholder="Ej: Bebidas Calientes" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Imagen</label>
                  <input type="file" accept="image/*" onChange={e => { setImage(e.target.files?.[0] || null); }}
                    className="w-full mt-1 text-sm text-[var(--admin-text-secondary)] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-[var(--admin-bg-tertiary)] file:text-[var(--admin-text-secondary)] file:cursor-pointer" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={loading}
                    className="flex-1 py-2 bg-[var(--admin-accent)] text-white text-sm rounded-lg hover:bg-[var(--admin-accent-hover)] disabled:opacity-50 font-medium transition-all">
                    {loading ? "Guardando..." : editing ? "Actualizar" : "Crear"}
                  </button>
                  <button type="button" onClick={resetForm}
                    className="px-4 py-2 bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] text-sm rounded-lg hover:bg-[var(--admin-bg-tertiary)] hover:text-[var(--admin-text)] transition-all">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Products */}
        {viewMode === "grid" ? (
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
            {filtered.map(p => renderGridCard(p))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-4 px-3 py-2 text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">
              <span className="w-12 shrink-0" />
              <span className="flex-1">Producto</span>
              <span className="shrink-0 w-16 text-right">Precio</span>
              <span className="shrink-0">Estado</span>
              <span className="shrink-0 w-40" />
            </div>
            {filtered.map(p => renderListRow(p))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[var(--admin-text-muted)]">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm">No hay productos {filterCategory ? `en "${filterCategory}"` : ""}</p>
          </div>
        )}
        </div>

        {/* Promo Form Modal */}
        {promoForm && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[var(--admin-bg-secondary)] border border-[var(--admin-border)] rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
              <h2 className="text-sm font-semibold text-[var(--admin-text)] mb-4">
                {editPromo ? "Editar" : "Nuevo"} {sectionType === "promotions" ? "Promocion" : "Paquete"}
              </h2>
              <form onSubmit={handlePromoSubmit} className="space-y-3">
                <div>
                  <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Nombre *</label>
                  <input type="text" value={promoName} onChange={e => setPromoName(e.target.value)} required
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Precio ($)</label>
                    <input type="number" value={promoPrice} onChange={e => setPromoPrice(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Tipo</label>
                    <select value={sectionType} onChange={e => setSectionType(e.target.value as any)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-all" disabled={!!editPromo}>
                      <option value="promotions">Promocion</option>
                      <option value="packages">Paquete</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Descripcion</label>
                  <textarea value={promoDesc} onChange={e => setPromoDesc(e.target.value)} rows={2}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-all resize-none" />
                </div>

                {/* Config section */}
                <div className="rounded-xl border border-[var(--admin-accent)]/20 bg-[var(--admin-accent)]/3 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--admin-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-xs font-medium text-[var(--admin-text)]">
                      {sectionType === "promotions" ? "Configurar productos elegibles" : "Configurar slots del paquete"}
                    </span>
                  </div>

                  {sectionType === "promotions" ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Cantidad a elegir</label>
                          <input type="number" value={promoPickCount} onChange={e => setPromoPickCount(Number(e.target.value))} min={1} max={10}
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-all" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Cantidad a pagar</label>
                          <input type="number" value={promoPayCount} onChange={e => setPromoPayCount(Number(e.target.value))} min={1} max={10}
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-all" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider block mb-1.5">Productos elegibles</label>
                          <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-input)] p-2">
                            {products.filter(p => p.active === 1).map(p => {
                              const checked = promoSelectedProds.includes(p.id);
                              return (
                                <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--admin-bg-hover)] cursor-pointer transition-colors">
                                  <input type="checkbox" checked={checked}
                                    onChange={() => setPromoSelectedProds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                                    className="w-3.5 h-3.5 rounded border-[var(--admin-border)] text-[var(--admin-accent)] focus:ring-[var(--admin-accent)]" />
                                  <span className="text-xs text-[var(--admin-text)]">{p.name}</span>
                                  <span className="text-[10px] text-[var(--admin-text-muted)] ml-auto">{p.category} — ${p.price.toFixed(0)}</span>
                                </label>
                              );
                            })}
                          </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      {promoSlots.map((slot, idx) => (
                        <div key={idx} className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-input)] p-3">
                          <div className="flex items-center justify-between mb-2">
                            <input type="text" value={slot.label} onChange={e => {
                              const next = [...promoSlots]; next[idx].label = e.target.value; setPromoSlots(next);
                            }} placeholder="Ej: Bebida Caliente"
                              className="flex-1 px-2 py-1 text-xs rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50" />
                            <button type="button" onClick={() => setPromoSlots(prev => prev.filter((_, i) => i !== idx))}
                              className="ml-2 w-6 h-6 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-all">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                              <div className="max-h-32 overflow-y-auto space-y-0.5">
                                {products.filter(p => p.active === 1).map(p => {
                                  const checked = slot.eligibleIds.includes(p.id);
                                  return (
                                    <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--admin-bg-hover)] cursor-pointer">
                                      <input type="checkbox" checked={checked}
                                        onChange={() => setPromoSlots(prev => prev.map((s, i) => {
                                          if (i !== idx) return s;
                                          return {
                                            ...s,
                                            eligibleIds: s.eligibleIds.includes(p.id)
                                              ? s.eligibleIds.filter(x => x !== p.id)
                                              : [...s.eligibleIds, p.id]
                                          };
                                        }))}
                                        className="w-3 h-3 rounded border-[var(--admin-border)] text-[var(--admin-accent)]" />
                                      <span className="text-[11px] text-[var(--admin-text)]">{p.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => setPromoSlots(prev => [...prev, { label: "", eligibleIds: [] }])}
                        className="w-full py-2 text-[11px] border border-dashed border-[var(--admin-border)] text-[var(--admin-text-muted)] rounded-lg hover:border-[var(--admin-accent)]/30 hover:text-[var(--admin-accent)] transition-all">
                        + Agregar slot
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider">Detalles adicionales (uno por linea)</label>
                  <textarea value={promoDetails} onChange={e => setPromoDetails(e.target.value)} rows={2}
                    placeholder="Valido lunes a viernes&#10;Hasta agotar existencias"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-sm text-[var(--admin-text)] font-mono focus:outline-none focus:border-[var(--admin-accent)]/50 transition-all resize-none" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={promoLoading}
                    className="flex-1 py-2 bg-[var(--admin-accent)] text-white text-sm rounded-lg hover:bg-[var(--admin-accent-hover)] disabled:opacity-50 font-medium transition-all">
                    {promoLoading ? "Guardando..." : editPromo ? "Actualizar" : "Crear"}
                  </button>
                  <button type="button" onClick={resetPromoForm}
                    className="px-4 py-2 bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] text-sm rounded-lg hover:bg-[var(--admin-bg-tertiary)] transition-all">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
