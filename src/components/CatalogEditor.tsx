"use client";

import { useState, useEffect, useCallback } from "react";

interface CatalogItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_path: string;
  active: number;
}

export default function CatalogEditor() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog");
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setCategory("");
    setImage(null);
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (item: CatalogItem) => {
    setName(item.name);
    setDescription(item.description);
    setPrice(String(item.price));
    setCategory(item.category);
    setImage(null);
    setEditing(item);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price || "0");
    formData.append("category", category);
    if (image) formData.append("image", image);

    try {
      if (editing) {
        await fetch(`/api/catalog/${editing.id}`, { method: "PUT", body: formData });
      } else {
        await fetch("/api/catalog", { method: "POST", body: formData });
      }
      resetForm();
      fetchItems();
    } catch (err) {
      console.error("Error guardando producto:", err);
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Desactivar este producto?")) return;
    try {
      await fetch(`/api/catalog/${id}`, { method: "DELETE" });
      fetchItems();
    } catch (err) {
      console.error("Error eliminando:", err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Catalogo de Productos
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {items.length} productos — panel de edicion en vivo
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition-all font-medium"
        >
          + Nuevo Producto
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md mx-4">
            <h3 className="text-sm font-semibold mb-4">
              {editing ? "Editar Producto" : "Nuevo Producto"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Nombre *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50"
                  placeholder="Ej: Cafe Americano" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Descripcion</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 resize-none"
                  placeholder="Descripcion del producto..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Precio ($)</label>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} step="0.01" min="0"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Categoria</label>
                  <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50"
                    placeholder="Ej: Bebidas Calientes" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Imagen</label>
                <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)}
                  className="w-full mt-1 text-sm text-[var(--text-secondary)] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-[var(--bg-tertiary)] file:text-[var(--text-secondary)]" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all font-medium">
                  {loading ? "Guardando..." : editing ? "Actualizar" : "Crear"}
                </button>
                <button type="button" onClick={resetForm}
                  className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-sm rounded-lg hover:bg-[var(--bg-hover)] transition-all">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.id} className={`glass-card p-4 ${item.active === 0 ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</h3>
                {item.category && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{item.category}</span>
                )}
              </div>
              <span className="text-sm font-semibold text-emerald-400 ml-2">${item.price.toFixed(0)}</span>
            </div>
            {item.description && (
              <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">{item.description}</p>
            )}
            <div className="flex items-center gap-1">
              <button onClick={() => startEdit(item)}
                className="flex-1 py-1.5 text-[11px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                Editar
              </button>
              <button onClick={() => handleDelete(item.id)}
                className="px-3 py-1.5 text-[11px] bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">No hay productos en el catalogo</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Agrega tu primer producto con el boton de arriba</p>
        </div>
      )}
    </div>
  );
}
