"use client";

import { useState, useEffect, useRef } from "react";
import AdminSidebar from "@/components/admin/Sidebar";

type Tab = "generate" | "templates" | "history";
type GenerateMode = "text" | "image" | "both";

interface GeneratedContent {
  caption: string;
  hashtags: string[];
  tone: string;
  target: string;
}

interface Product {
  id: number; name: string; description: string; price: number; category: string; image_path: string; active: number;
}

const ASPECTS = [
  { value: "1:1", label: "Cuadrado 1:1" },
  { value: "4:3", label: "Horizontal 4:3" },
  { value: "3:4", label: "Vertical 3:4" },
  { value: "16:9", label: "Panoramico 16:9" },
  { value: "9:16", label: "Story 9:16" },
];

const COPY_TYPES = [
  { id: "promocional", label: "Promocional", emoji: "🔥", desc: "Oferta, descuento, 2x1" },
  { id: "lanzamiento", label: "Lanzamiento", emoji: "🆕", desc: "Nuevo producto, expectativa" },
  { id: "engagement", label: "Engagement", emoji: "💬", desc: "Pregunta, reto, interacción" },
  { id: "deseo", label: "Deseo", emoji: "✨", desc: "Aspiracional, estilo de vida" },
  { id: "urgencia", label: "Urgencia", emoji: "⏰", desc: "Stock limitado, por tiempo" },
];

const TEMPLATES = [
  { id: "promo-dia", title: "Promocion del Dia", desc: "Publicacion atractiva para promocionar oferta especial.", prompt: "Eres un experto en marketing para cafeterias. Genera un copy corto y persuasivo para redes sociales promocionando un producto especial del dia. Incluye llamado a la accion. Max 2-3 frases." },
  { id: "nuevo-producto", title: "Nuevo Producto", desc: "Anuncia un nuevo producto generando expectativa.", prompt: "Eres un copywriter experto. Genera un copy corto y persuasivo anunciando un nuevo producto de cafeteria. Genera expectativa y deseo. Max 2-3 frases." },
  { id: "evento-especial", title: "Evento Especial", desc: "Promueve musica en vivo, cata de cafe, noche tematica.", prompt: "Eres un community manager. Genera un copy corto y llamativo para promocionar un evento especial en una cafeteria. Incluye fecha/hora si se menciona. Max 2-3 frases." },
  { id: "historia-negocio", title: "Historia del Negocio", desc: "Comparte la historia para conectar con clientes.", prompt: "Eres un storyteller. Genera un copy emotivo y corto contando la esencia de una cafeteria local. Autentico y que conecte. Max 2-3 frases." },
  { id: "resena-cliente", title: "Resena de Cliente", desc: "Destaca una resena positiva para generar confianza.", prompt: "Eres un community manager. Genera un copy elegante destacando una resena positiva sobre un producto de cafeteria. Invita a otros a probarlo. Max 2-3 frases." },
  { id: "tip-cafe", title: "Tip de Cafe", desc: "Comparte conocimiento sobre cafe o maridaje.", prompt: "Eres un barista experto. Genera un copy educativo y corto con un tip o dato curioso sobre cafe, relacionado con un producto del menu. Max 2-3 frases." },
];

function getImageUrl(p: Product | null): string | null {
  if (!p?.image_path) return null;
  if (p.image_path.startsWith("/uploads/")) return p.image_path;
  const filename = p.image_path.replace(/\\/g, "/").split("/").pop();
  if (filename) return `/uploads/catalog/${filename}`;
  return null;
}

export default function AdminContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const [prompt, setPrompt] = useState("");
  const [whatToSay, setWhatToSay] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedContent, setSavedContent] = useState<Array<{
    id: string; caption: string; date: string; images: string[];
    copyType: string; productName: string; aspectRatio: string;
  }>>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Image config
  const [generateMode, setGenerateMode] = useState<GenerateMode>("text");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [imageCount, setImageCount] = useState(1);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [copyType, setCopyType] = useState("promocional");

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setProducts(d.filter((p: Product) => p.active === 1)); })
      .catch(() => {});

    // Load saved history from localStorage
    try {
      const saved = localStorage.getItem("content_history");
      if (saved) setSavedContent(JSON.parse(saved));
    } catch {}
  }, []);

  // Persist history to localStorage
  useEffect(() => {
    localStorage.setItem("content_history", JSON.stringify(savedContent));
  }, [savedContent]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedProduct = products.find(p => p.id === selectedProductId) || null;
  const productImageUrl = getImageUrl(selectedProduct);

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setPrompt(t.prompt);
    setWhatToSay("");
    setResult(null);
    setGeneratedImages([]);
    setError("");
    setActiveTab("generate");
  };

  const handleGenerate = async () => {
    const needsText = generateMode === "text" || generateMode === "both";
    const needsImages = generateMode === "image" || generateMode === "both";

    if (!whatToSay.trim() && !prompt.trim()) {
      setError("Escribe que quieres decir o selecciona un template");
      return;
    }

    setGenerating(true);
    setError("");
    setResult(null);
    setGeneratedImages([]);

    let generatedCaption = "";
    let savedImages: string[] = [];

    try {
      // Step 1: Generate text copy via OpenAI
      if (needsText) {
        const copyTypeInfo = COPY_TYPES.find(c => c.id === copyType);
        const systemPrompt = prompt || `Eres un copywriter experto en marketing para cafeterias. Genera un copy corto, persuasivo y que invite a la accion. Maximo 2-3 frases. Incluye emojis.`;

        const res = await fetch("/api/content/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: systemPrompt,
            instructions: `TIPO DE COPY: ${copyTypeInfo?.label} - ${copyTypeInfo?.desc}. QUE QUIERE DECIR: ${whatToSay || "Genera contenido atractivo para cafeteria"}. Producto: ${selectedProduct ? selectedProduct.name + " - " + selectedProduct.description + " - $" + selectedProduct.price.toFixed(0) : "cafeteria local"}. El copy debe ser CORTO (max 3 frases), PERSUASIVO, y generar INTERACCION o VENTA.`,
            product: selectedProduct ? {
              name: selectedProduct.name,
              description: selectedProduct.description,
              price: selectedProduct.price,
              category: selectedProduct.category,
            } : null,
          }),
        });
        const data = await res.json();
        if (data.error) {
          setError("Error generando copy: " + data.error);
        } else {
          setResult(data);
          generatedCaption = data.caption || "";
        }
      }

      // Step 2: Generate images via Kie AI
      if (needsImages) {
        let imgPrompt = "";
        const productName = selectedProduct ? selectedProduct.name : "producto de cafeteria";
        const useProductRef = !!productImageUrl;

        if (generateMode === "both" && generatedCaption) {
          const hashtags = (result?.hashtags || []).map((h: string) => h.charAt(0).toLowerCase() + h.slice(1));
          imgPrompt = useProductRef
            ? `Transform this product photo into a professional promotional poster for Instagram. Overlay the following text prominently on the image in a clean, modern font: "${generatedCaption}". Include hashtags at the bottom: #${hashtags.join(" #")}. Keep the product visible and attractive. Professional food marketing style, warm tones, high quality.`
            : `Professional promotional poster for Instagram. Display the following text prominently in a clean modern font: "${generatedCaption}". Include hashtags at the bottom: #${hashtags.join(" #")}. Coffee shop aesthetic, warm tones, high quality photorealistic. ${selectedProduct ? "Product: " + selectedProduct.name : ""}`;
        } else {
          imgPrompt = useProductRef
            ? `Professional product photography enhancement. Make this ${productName} look irresistible, warm lighting, cozy coffee shop aesthetic, high quality commercial photography. ${selectedProduct ? selectedProduct.description : ""}`
            : `Professional food photography of ${productName}. Cozy coffee shop setting, warm natural lighting, steam, high quality photorealistic commercial photography. Make it look delicious and inviting.`;
        }

        const imgRes = await fetch("/api/content/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: imgPrompt,
            aspectRatio,
            count: imageCount,
            inputImage: useProductRef ? productImageUrl : undefined,
          }),
        });
        const imgData = await imgRes.json();
        if (imgData.error && !needsText) {
          setError("Error generando imagen: " + imgData.error);
        } else if (imgData.error && needsText) {
          setError("Copy listo. Error en imagen: " + imgData.error);
        } else if (imgData.images) {
          setGeneratedImages(imgData.images);
          savedImages = imgData.images;
        }
      }
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
    }
    setGenerating(false);

    // Auto-save to history
    if (generatedCaption || savedImages.length > 0) {
      const entry = {
        id: Date.now().toString(),
        caption: generatedCaption,
        date: new Date().toLocaleDateString("es-MX"),
        images: [...savedImages],
        copyType,
        productName: selectedProduct?.name || "",
        aspectRatio,
      };
      setSavedContent(prev => {
        const exists = prev.some(i => i.caption === entry.caption && i.productName === entry.productName);
        if (exists) return prev;
        return [entry, ...prev].slice(0, 30);
      });
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const full = `${result.caption}\n\n${result.hashtags.map(h => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    const entry = {
      id: Date.now().toString(),
      caption: result?.caption || "",
      date: new Date().toLocaleDateString("es-MX"),
      images: [...generatedImages],
      copyType,
      productName: selectedProduct?.name || "",
      aspectRatio,
    };
    setSavedContent(prev => {
      // Deduplicate: skip if same content already exists
      const exists = prev.some(i => i.caption === entry.caption && i.productName === entry.productName);
      if (exists) return prev;
      return [entry, ...prev];
    });
  };

  const downloadImage = async (url: string, index: number) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `cafeteria-luna-${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const modeLabel = generateMode === "text" ? "Solo Texto" : generateMode === "image" ? "Solo Imagen" : "Img + Texto";

  return (
    <div className="flex h-screen bg-[var(--admin-bg)]">
      <AdminSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <button onClick={() => setSidebarOpen(true)}
          className="md:hidden mb-4 w-10 h-10 rounded-xl bg-[var(--admin-bg-secondary)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-[var(--admin-text)]">Crear Contenido</h1>
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
              Sistema de creativos — genera copies e imagenes para redes sociales
            </p>
          </div>

          {/* Product selector with thumbnails */}
          <div className="mb-5 rounded-2xl border border-[var(--admin-accent)]/10 bg-[var(--admin-accent)]/3 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--admin-accent)]/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[var(--admin-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="flex-1" ref={dropdownRef}>
                <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider block mb-1">
                  Producto del menu
                </label>
                <button onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-sm text-[var(--admin-text)] hover:border-[var(--admin-accent)]/50 transition-all text-left">
                  {selectedProduct ? (
                    <>
                      {productImageUrl && (
                        <img src={productImageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                      )}
                      <span className="flex-1">{selectedProduct.name} <span className="text-[var(--admin-text-muted)]">— ${selectedProduct.price.toFixed(0)}</span></span>
                    </>
                  ) : (
                    <span className="text-[var(--admin-placeholder)]">Selecciona un producto...</span>
                  )}
                  <svg className="w-4 h-4 text-[var(--admin-text-muted)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute z-50 mt-1 w-[calc(100%-3rem)] max-w-lg max-h-64 overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] shadow-xl">
                    {products.map(p => {
                      const thumb = getImageUrl(p);
                      return (
                        <button key={p.id} onClick={() => { setSelectedProductId(p.id); setDropdownOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[var(--admin-bg-tertiary)] transition-colors text-left ${
                            selectedProductId === p.id ? "bg-[var(--admin-accent)]/10 text-[var(--admin-accent)]" : "text-[var(--admin-text)]"
                          }`}>
                          {thumb ? (
                            <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-[var(--admin-border)]" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5 text-[var(--admin-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{p.name}</p>
                            <p className="text-[10px] text-[var(--admin-text-muted)]">{p.category} — ${p.price.toFixed(0)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-[var(--admin-bg-secondary)] border border-[var(--admin-border)] rounded-xl p-1 w-fit">
            {[
              { k: "generate" as Tab, label: "Generar", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
              { k: "templates" as Tab, label: "Templates", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
              { k: "history" as Tab, label: "Historial", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
            ].map(tab => (
              <button key={tab.k} onClick={() => setActiveTab(tab.k)}
                className={`flex items-center gap-2 px-4 py-2 text-xs rounded-lg transition-all ${
                  activeTab === tab.k
                    ? "bg-[var(--admin-accent)] text-white font-medium shadow-[0_2px_8px_rgba(192,122,91,0.3)]"
                    : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]"
                }`}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ===== GENERATE TAB ===== */}
          {activeTab === "generate" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
              {/* LEFT: inputs */}
              <div className="space-y-4">
                {/* Copy type selector */}
                <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] p-5">
                  <h2 className="text-sm font-semibold text-[var(--admin-text)] mb-3">Tipo de copy</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {COPY_TYPES.map(ct => (
                      <button key={ct.id} onClick={() => setCopyType(ct.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-[11px] rounded-xl border transition-all ${
                          copyType === ct.id
                            ? "bg-[var(--admin-accent)]/15 border-[var(--admin-accent)]/30 text-[var(--admin-accent)] font-medium"
                            : "border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-accent)]/20"
                        }`}>
                        <span>{ct.emoji}</span> {ct.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--admin-text-muted)] mt-2">
                    {COPY_TYPES.find(c => c.id === copyType)?.desc}
                  </p>
                </div>

                {/* ¿Qué quieres decir? */}
                <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-[var(--admin-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h2 className="text-sm font-semibold text-[var(--admin-text)]">Que quieres decir?</h2>
                    {selectedProduct && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--admin-accent)]/15 text-[var(--admin-accent)]">{selectedProduct.name}</span>
                    )}
                  </div>
                  <textarea
                    value={whatToSay}
                    onChange={e => setWhatToSay(e.target.value)}
                    placeholder={selectedProduct
                      ? `Ej: "Tenemos 20% de descuento en ${selectedProduct.name} este fin de semana" o "Prueba nuestro nuevo ${selectedProduct.name}, el favorito de la casa"`
                      : 'Ej: "2x1 en bebidas calientes todos los martes" o "Nuevo latte de avellana, solo por tiempo limitado"'}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-placeholder)] focus:outline-none focus:border-[var(--admin-accent)]/50 focus:ring-1 focus:ring-[var(--admin-accent)]/20 resize-none transition-all"
                  />
                </div>

                {/* Image configuration */}
                <div className="rounded-2xl border border-[var(--admin-accent)]/10 bg-[var(--admin-accent)]/3 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-[var(--admin-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h2 className="text-sm font-semibold text-[var(--admin-text)]">Configuracion de Imagen</h2>
                  </div>

                  {/* Mode toggle */}
                  <div className="mb-4">
                    <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider block mb-1.5">Tipo de generacion</label>
                    <div className="flex gap-1 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-xl p-1 w-fit">
                      {[
                        { k: "text" as GenerateMode, label: "Solo Texto", icon: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" },
                        { k: "image" as GenerateMode, label: "Solo Imagen", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
                        { k: "both" as GenerateMode, label: "Img + Texto", icon: "M4 6h16M4 12h16m-7 6h7" },
                      ].map(mode => (
                        <button key={mode.k} onClick={() => setGenerateMode(mode.k)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] rounded-lg transition-all ${
                            generateMode === mode.k
                              ? "bg-[var(--admin-accent)] text-white font-medium"
                              : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]"
                          }`}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mode.icon} />
                          </svg>
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(generateMode === "image" || generateMode === "both") && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider block mb-1.5">Relacion de aspecto</label>
                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-input)] text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]/50 transition-all">
                          {ASPECTS.map(a => (<option key={a.value} value={a.value}>{a.label}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--admin-text-muted)] uppercase tracking-wider block mb-1.5">Cantidad (1-5)</label>
                        <div className="flex items-center gap-2">
                          <input type="range" min="1" max="5" value={imageCount}
                            onChange={e => setImageCount(Number(e.target.value))}
                            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                            style={{ background: `linear-gradient(to right, var(--admin-accent) 0%, var(--admin-accent) ${((imageCount-1)/4)*100}%, var(--admin-border) ${((imageCount-1)/4)*100}%, var(--admin-border) 100%)` }}
                          />
                          <span className="text-sm font-mono font-medium text-[var(--admin-accent)] w-4 text-center">{imageCount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-[var(--admin-text-muted)] mt-3">
                    Modelos: GPT-4o-mini (copy) + GPT Image 2 (imagen) — configuración interna
                  </p>
                </div>

                <button onClick={handleGenerate} disabled={generating}
                  className="w-full py-3 bg-[var(--admin-accent)] text-white text-sm rounded-xl hover:bg-[var(--admin-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all shadow-[0_4px_12px_rgba(192,122,91,0.2)] hover:shadow-[0_4px_20px_rgba(192,122,91,0.35)] active:scale-[0.98]">
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generando {modeLabel}...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generar {modeLabel}
                    </span>
                  )}
                </button>

                {error && (
                  <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs">{error}</div>
                )}
              </div>

              {/* RIGHT: results */}
              <div className="space-y-4">
                {!result && !generating && generatedImages.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-bg-secondary)]/50 p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
                    <svg className="w-16 h-16 text-[var(--admin-border)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-[var(--admin-text-muted)] mb-1">Tu creativo aparecera aqui</p>
                    <p className="text-xs text-[var(--admin-placeholder)] max-w-xs">Selecciona un producto, escribe que quieres decir, elige el tipo de copy y genera</p>
                  </div>
                )}

                {generating && (
                  <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] p-8 text-center animate-pulse space-y-3">
                    <div className="h-3 bg-[var(--admin-border)] rounded w-3/4 mx-auto" />
                    <div className="h-3 bg-[var(--admin-border)] rounded w-full" />
                    <div className="h-3 bg-[var(--admin-border)] rounded w-5/6" />
                  </div>
                )}

                {/* Text preview */}
                {result && (generateMode === "text" || generateMode === "both") && (
                  <div className="animate-scale-in">
                    <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] overflow-hidden">
                      <div className="border-b border-[var(--admin-border)] p-3 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--admin-accent)]/20 flex items-center justify-center">
                          <span className="text-xs text-[var(--admin-accent)] font-bold">L</span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[var(--admin-text)]">cafeteria_luna</p>
                          <p className="text-[10px] text-[var(--admin-text-muted)]">Copy {COPY_TYPES.find(c => c.id === copyType)?.label}{selectedProduct ? ` • ${selectedProduct.name}` : ""}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="text-sm text-[var(--admin-text)] whitespace-pre-wrap leading-relaxed">{result.caption}</div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {result.hashtags.map(h => {
                            const tag = h.replace(/^#/, "");
                            return <span key={tag} className="text-xs text-[#6b91c7]">#{tag}</span>;
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { handleCopy(); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--admin-bg-secondary)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] text-xs rounded-xl hover:border-[var(--admin-accent)]/30 hover:text-[var(--admin-text)] transition-all font-medium">
                        {copied ? "✓ Copiado!" : "Copiar"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Image results */}
                {generatedImages.length > 0 && (
                  <div className={generateMode === "both" && result ? "mt-3" : ""}>
                    <div className="space-y-3 animate-fade-up">
                      {generatedImages.map((url, idx) => (
                        <div key={idx} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] overflow-hidden">
                          <div className="bg-[var(--admin-bg)] flex items-center justify-center cursor-pointer" onClick={() => setLightboxUrl(url)}>
                            <img src={url} alt={`Generated ${idx + 1}`} className="w-full h-auto object-contain max-h-[350px] hover:opacity-90 transition-opacity"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                          <div className="p-3 flex items-center justify-between">
                            <span className="text-[10px] text-[var(--admin-text-muted)]">Imagen {idx + 1} de {generatedImages.length} — {aspectRatio}</span>
                            <div className="flex gap-2">
                              <button onClick={() => setLightboxUrl(url)}
                                className="flex items-center gap-1 px-3 py-1.5 text-[11px] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] rounded-lg hover:border-[var(--admin-accent)]/30 transition-all">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                                Ampliar
                              </button>
                              <button onClick={() => downloadImage(url, idx)}
                                className="flex items-center gap-1 px-3 py-1.5 text-[11px] bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/20 text-[var(--admin-accent)] rounded-lg hover:bg-[var(--admin-accent)]/15 transition-all font-medium">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Descargar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== TEMPLATES TAB ===== */}
          {activeTab === "templates" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 animate-fade-up">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t)}
                  className="text-left p-5 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-bg-secondary)] hover:border-[var(--admin-accent)]/30 hover:bg-[var(--admin-bg-hover)] transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-[var(--admin-accent)]/10 flex items-center justify-center mb-3 group-hover:bg-[var(--admin-accent)]/20 transition-colors">
                    <svg className="w-4 h-4 text-[var(--admin-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-1.5">{t.title}</h3>
                  <p className="text-xs text-[var(--admin-text-secondary)] leading-relaxed">{t.desc}</p>
                  {selectedProduct && (
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--admin-accent)]">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Usara: {selectedProduct.name}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ===== HISTORY TAB ===== */}
          {activeTab === "history" && (
            <div className="animate-fade-up">
              {savedContent.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-bg-secondary)]/50 p-12 text-center">
                  <svg className="w-12 h-12 text-[var(--admin-border)] mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-sm text-[var(--admin-text-muted)] mb-1">No hay contenido guardado</p>
                  <p className="text-xs text-[var(--admin-placeholder)]">Genera contenido y guardalo para verlo aqui</p>
                </div>
              ) : (
                <>
                  {/* Bulk actions */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)] cursor-pointer select-none">
                        <input type="checkbox"
                          checked={savedContent.length > 0 && selectedItems.size === savedContent.length}
                          onChange={() => {
                            if (selectedItems.size === savedContent.length) {
                              setSelectedItems(new Set());
                            } else {
                              setSelectedItems(new Set(savedContent.map(i => i.id)));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-[var(--admin-border)] text-[var(--admin-accent)] focus:ring-[var(--admin-accent)]"
                        />
                        {selectedItems.size > 0 ? `${selectedItems.size} seleccionados` : "Seleccionar todos"}
                      </label>
                    </div>
                    {selectedItems.size > 0 && (
                      <button onClick={() => {
                        setSavedContent(prev => prev.filter(i => !selectedItems.has(i.id)));
                        setSelectedItems(new Set());
                      }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/15 transition-all">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar ({selectedItems.size})
                      </button>
                    )}
                  </div>

                  {/* Gallery grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {savedContent.map(item => {
                      const thumb = item.images[0];
                      const isSelected = selectedItems.has(item.id);
                      return (
                        <div key={item.id}
                          className={`rounded-2xl border bg-[var(--admin-bg-secondary)] overflow-hidden transition-all group ${
                            isSelected ? "border-[var(--admin-accent)]/50 ring-1 ring-[var(--admin-accent)]/20" : "border-[var(--admin-border)] hover:border-[var(--admin-accent)]/30"
                          }`}>
                          {/* Image */}
                          <div className="aspect-square bg-[var(--admin-bg)] relative cursor-pointer" onClick={() => thumb && setLightboxUrl(thumb)}>
                            {thumb ? (
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-[var(--admin-border)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                            {/* Select checkbox */}
                            <label className="absolute top-2 left-2 cursor-pointer" onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={isSelected}
                                onChange={() => {
                                  const next = new Set(selectedItems);
                                  if (isSelected) next.delete(item.id); else next.add(item.id);
                                  setSelectedItems(next);
                                }}
                                className="w-4 h-4 rounded border-white/40 bg-black/30 text-[var(--admin-accent)] focus:ring-[var(--admin-accent)] opacity-0 group-hover:opacity-100 transition-opacity checked:opacity-100"
                              />
                            </label>
                            {/* Image count badge */}
                            {item.images.length > 1 && (
                              <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-medium">
                                +{item.images.length - 1}
                              </span>
                            )}
                          </div>
                          {/* Info */}
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-[var(--admin-text-muted)]">{item.date}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--admin-accent)]/10 text-[var(--admin-accent)]">{item.copyType}</span>
                            </div>
                            {item.productName && (
                              <p className="text-[10px] text-[var(--admin-text-muted)] mb-1">{item.productName} · {item.aspectRatio}</p>
                            )}
                            {item.caption && (
                              <p className="text-[11px] text-[var(--admin-text-secondary)] line-clamp-2 leading-relaxed">{item.caption}</p>
                            )}
                            {/* Actions */}
                            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {item.images.length > 0 && (
                                <button onClick={() => downloadImage(item.images[0], 0)}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] rounded-lg hover:bg-[var(--admin-accent)]/15 transition-all">
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Descargar
                                </button>
                              )}
                              {item.caption && (
                                <button onClick={() => { navigator.clipboard.writeText(item.caption); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                  className="px-2 py-1.5 text-[10px] border border-[var(--admin-border)] text-[var(--admin-text-muted)] rounded-lg hover:border-[var(--admin-accent)]/30 transition-all">
                                  Copiar
                                </button>
                              )}
                              <button onClick={() => {
                                const next = new Set(selectedItems);
                                if (isSelected) next.delete(item.id); else next.add(item.id);
                                setSelectedItems(next);
                              }}
                                className={`px-2 py-1.5 text-[10px] border rounded-lg transition-all ${isSelected ? "border-[var(--admin-accent)]/30 text-[var(--admin-accent)]" : "border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:border-[var(--admin-accent)]/30"}`}>
                                {isSelected ? "✓" : "Sel"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-lg">
              ✕
            </button>
            <img src={lightboxUrl} alt="Preview" className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
              <button onClick={() => downloadImage(lightboxUrl, 0)}
                className="px-4 py-2 bg-white text-black text-sm rounded-xl hover:bg-gray-200 transition-all font-medium flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
