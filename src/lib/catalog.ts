import { getCatalog, searchCatalog } from "./db";

export interface CatalogItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_path: string;
  active: number;
}

export function getMenu(): CatalogItem[] {
  return getCatalog() as CatalogItem[];
}

export function getCategories(): string[] {
  const cats = new Set<string>();
  for (const item of getMenu()) {
    if (item.category) cats.add(item.category);
  }
  return Array.from(cats).sort();
}

export function searchProducts(query: string): CatalogItem[] {
  return searchCatalog(query) as CatalogItem[];
}

export function formatCatalogForWhatsApp(category?: string): string {
  const items = category
    ? getMenu().filter((i) => i.category === category)
    : getMenu();

  if (items.length === 0) return "Lo siento, no hay productos disponibles en este momento.";

  const byCategory: Record<string, CatalogItem[]> = {};
  for (const item of items) {
    const cat = item.category || "General";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  }

  let text = "Nuestros Productos:\n\n";
  for (const [cat, prods] of Object.entries(byCategory)) {
    text += `*${cat}:*\n`;
    for (const p of prods) {
      text += ` ${p.name} — $${p.price.toFixed(0)}`;
      if (p.description) text += `\n   _${p.description}_`;
      text += "\n";
    }
    text += "\n";
  }

  text += "Escribe el nombre del producto que te interesa para mas informacion.";
  return text;
}

export function formatCartSummary(
  items: { name: string; quantity: number; price: number }[],
  total: number
): string {
  let text = "*Resumen de tu pedido:*\n\n";
  for (const item of items) {
    text += ` ${item.name} x${item.quantity} — $${(item.price * item.quantity).toFixed(0)}\n`;
  }
  text += `\n*Total: $${total.toFixed(0)}*`;
  return text;
}
