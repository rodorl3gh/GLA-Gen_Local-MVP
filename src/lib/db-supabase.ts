// Supabase database functions — mirrors src/lib/db.ts API
// Uses @supabase/supabase-js instead of better-sqlite3

import { supabase, getSupabaseAdmin } from "./supabase/client";

// ── Helpers ──

function admin() {
  return getSupabaseAdmin();
}

// ── Orders ──

export function createOrder(
  phone: string,
  items: any[],
  total: number,
  paymentMethod: string,
  notes?: string,
  mpPaymentId?: string,
  paymentStatus?: string,
  mpPaymentData?: any
): number {
  // Note: This is async in reality but db.ts is sync.
  // We use a sync wrapper pattern for compatibility.
  return 0; // Placeholder — see async version below
}

export async function createOrderAsync(
  phone: string,
  items: any[],
  total: number,
  paymentMethod: string,
  notes?: string,
  mpPaymentId?: string,
  paymentStatus?: string,
  mpPaymentData?: any
): Promise<number> {
  const { data, error } = await admin()
    .from("orders")
    .insert({
      phone,
      items,
      total,
      payment_method: paymentMethod,
      notes: notes || "",
      mp_payment_id: mpPaymentId || "",
      payment_status: paymentStatus || "pending",
      mp_payment_data: mpPaymentData || {},
    })
    .select("id")
    .single();

  if (error) throw new Error(`createOrder: ${error.message}`);
  return data.id;
}

export async function getOrders(fromTs?: number, toTs?: number): Promise<any[]> {
  let query = admin().from("orders").select("*").order("created_at", { ascending: false });

  if (fromTs) {
    query = query.gte("created_at", new Date(fromTs * 1000).toISOString());
  }
  if (toTs) {
    query = query.lte("created_at", new Date(toTs * 1000).toISOString());
  }

  const { data, error } = await query;
  if (error) throw new Error(`getOrders: ${error.message}`);
  return data || [];
}

export async function getOrderById(id: number): Promise<any> {
  const { data, error } = await admin()
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function getOrdersByPhone(phone: string): Promise<any[]> {
  const { data, error } = await admin()
    .from("orders")
    .select("*")
    .ilike("phone", `%${phone}%`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getOrdersByPhone: ${error.message}`);
  return data || [];
}

export async function updateOrderStatus(
  id: number,
  status: "pending" | "preparing" | "delivered" | "cancelled" | "expirado"
): Promise<void> {
  const { error } = await admin()
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(`updateOrderStatus: ${error.message}`);
}

export async function updateOrderPayment(
  orderId: number,
  mpPaymentId: string,
  paymentStatus: string,
  mpPaymentData?: any
): Promise<void> {
  const { error } = await admin()
    .from("orders")
    .update({
      mp_payment_id: mpPaymentId,
      payment_status: paymentStatus,
      mp_payment_data: mpPaymentData || {},
    })
    .eq("id", orderId);

  if (error) throw new Error(`updateOrderPayment: ${error.message}`);
}

export async function updatePaymentStatus(orderId: number, paymentStatus: string): Promise<void> {
  const { error } = await admin()
    .from("orders")
    .update({ payment_status: paymentStatus })
    .eq("id", orderId);

  if (error) throw new Error(`updatePaymentStatus: ${error.message}`);
}

export async function getOrderByMpPaymentId(mpPaymentId: string): Promise<any> {
  const { data, error } = await admin()
    .from("orders")
    .select("*")
    .eq("mp_payment_id", mpPaymentId)
    .single();

  if (error) return null;
  return data;
}

export async function getOrdersStats(): Promise<any> {
  const { data: orders, error } = await admin()
    .from("orders")
    .select("status, payment_status, total, created_at");

  if (error) throw new Error(`getOrdersStats: ${error.message}`);

  const now = new Date();
  const todayMexico = new Date(Date.now() - 6 * 3600000);
  const todayStr = todayMexico.toISOString().split("T")[0];

  const total = orders?.length || 0;
  const pendientes = orders?.filter((o: any) => o.status === "pending").length || 0;
  const hoy = orders?.filter((o: any) => {
    const d = new Date(o.created_at);
    const mexicoDate = new Date(d.getTime() - 6 * 3600000);
    return mexicoDate.toISOString().split("T")[0] === todayStr;
  }).length || 0;
  const ingresosHoy = orders
    ?.filter((o: any) => {
      if (o.payment_status !== "approved") return false;
      const d = new Date(o.created_at);
      const mexicoDate = new Date(d.getTime() - 6 * 3600000);
      return mexicoDate.toISOString().split("T")[0] === todayStr;
    })
    .reduce((s: number, o: any) => s + Number(o.total), 0) || 0;

  return { total, hoy, pendientes, ingresos_hoy: ingresosHoy };
}

// ── Pending Orders ──

export async function insertPendingOrder(
  ref: string,
  phone: string,
  items: any[],
  total: number,
  paymentMethod: string,
  notes?: string,
  paymentType?: string
): Promise<number> {
  const { data, error } = await admin()
    .from("pending_orders")
    .insert({
      external_ref: ref,
      phone,
      items,
      total,
      payment_method: paymentMethod,
      notes: notes || "",
      payment_type: paymentType || "card",
    })
    .select("id")
    .single();

  if (error) throw new Error(`insertPendingOrder: ${error.message}`);
  return data.id;
}

export async function getPendingOrderByRef(externalRef: string): Promise<any> {
  const { data, error } = await admin()
    .from("pending_orders")
    .select("*")
    .eq("external_ref", externalRef)
    .single();

  if (error) return null;
  return data;
}

export async function deletePendingOrder(externalRef: string): Promise<void> {
  const { error } = await admin()
    .from("pending_orders")
    .delete()
    .eq("external_ref", externalRef);

  if (error) throw new Error(`deletePendingOrder: ${error.message}`);
}

export async function cleanExpiredPendingOrders(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { error } = await admin()
    .from("pending_orders")
    .delete()
    .lt("created_at", oneHourAgo);

  if (error) throw new Error(`cleanExpiredPendingOrders: ${error.message}`);
}

// ── Catalog ──

export async function getCatalog(): Promise<any[]> {
  const { data, error } = await supabase
    .from("catalog")
    .select("*")
    .order("category")
    .order("name");

  if (error) throw new Error(`getCatalog: ${error.message}`);
  return data || [];
}

export async function getCatalogItem(id: number): Promise<any> {
  const { data, error } = await supabase
    .from("catalog")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function createCatalogItem(item: {
  name: string; description?: string; price: number; category?: string; image_path?: string;
}): Promise<number> {
  const { data, error } = await admin()
    .from("catalog")
    .insert(item)
    .select("id")
    .single();

  if (error) throw new Error(`createCatalogItem: ${error.message}`);
  return data.id;
}

export async function updateCatalogItem(id: number, updates: any): Promise<void> {
  updates.updated_at = new Date().toISOString();
  const { error } = await admin()
    .from("catalog")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(`updateCatalogItem: ${error.message}`);
}

export async function deleteCatalogItem(id: number): Promise<void> {
  const { error } = await admin()
    .from("catalog")
    .update({ active: 0, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`deleteCatalogItem: ${error.message}`);
}

// ── Payment Methods ──

export async function getPaymentMethods(): Promise<any[]> {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .order("id");

  if (error) throw new Error(`getPaymentMethods: ${error.message}`);
  return data || [];
}

export async function getEnabledPaymentMethods(): Promise<any[]> {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("enabled", 1)
    .order("id");

  if (error) throw new Error(`getEnabledPaymentMethods: ${error.message}`);
  return data || [];
}

export async function updatePaymentMethod(id: number, updates: any): Promise<void> {
  updates.updated_at = new Date().toISOString();
  const { error } = await admin()
    .from("payment_methods")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(`updatePaymentMethod: ${error.message}`);
}

export async function createPaymentMethod(name: string, enabled: number, details: string[]): Promise<number> {
  const { data, error } = await admin()
    .from("payment_methods")
    .insert({ name, enabled, details })
    .select("id")
    .single();

  if (error) throw new Error(`createPaymentMethod: ${error.message}`);
  return data.id;
}

// ── Promotions ──

export async function getPromotions(): Promise<any[]> {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .order("type")
    .order("name");

  if (error) throw new Error(`getPromotions: ${error.message}`);
  return data || [];
}

export async function getActivePromotions(): Promise<any[]> {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("active", 1)
    .order("type")
    .order("name");

  if (error) throw new Error(`getActivePromotions: ${error.message}`);
  return data || [];
}

export async function createPromotion(promo: any): Promise<number> {
  const { data, error } = await admin()
    .from("promotions")
    .insert(promo)
    .select("id")
    .single();

  if (error) throw new Error(`createPromotion: ${error.message}`);
  return data.id;
}

export async function updatePromotion(id: number, updates: any): Promise<void> {
  updates.updated_at = new Date().toISOString();
  const { error } = await admin()
    .from("promotions")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(`updatePromotion: ${error.message}`);
}

export async function deletePromotion(id: number): Promise<void> {
  const { error } = await admin()
    .from("promotions")
    .update({ active: 0, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`deletePromotion: ${error.message}`);
}

// ── Owner Config ──

export async function getOwnerConfig(): Promise<any> {
  const { data, error } = await admin()
    .from("owner_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) return null;
  return data;
}

export async function updateOwnerConfig(config: any): Promise<void> {
  const { error } = await admin()
    .from("owner_config")
    .update(config)
    .eq("id", 1);

  if (error) throw new Error(`updateOwnerConfig: ${error.message}`);
}

// ── Users ──

export async function getUserByUsername(username: string): Promise<any> {
  const { data, error } = await admin()
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (error) return null;
  return data;
}

export async function createUser(username: string, passwordHash: string, role?: string): Promise<number> {
  const { data, error } = await admin()
    .from("users")
    .insert({ username, password_hash: passwordHash, role: role || "operator" })
    .select("id")
    .single();

  if (error) throw new Error(`createUser: ${error.message}`);
  return data.id;
}
