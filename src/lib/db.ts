import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "gla-negocio-local-test.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH);

  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.pragma("busy_timeout = 5000");

  runMigrations(_db);
  return _db;
}

function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      mode TEXT CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI',
      source TEXT DEFAULT 'whatsapp',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conv_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL,
      content TEXT NOT NULL,
      media_path TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv
      ON messages(conv_id, created_at);

    CREATE TABLE IF NOT EXISTS catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      category TEXT DEFAULT '',
      image_path TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      items TEXT NOT NULL DEFAULT '[]',
      total REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT '',
      status TEXT CHECK(status IN ('pending','preparing','delivered','cancelled','expirado')) NOT NULL DEFAULT 'pending',
      notes TEXT DEFAULT '',
      mp_payment_id TEXT DEFAULT '',
      payment_status TEXT DEFAULT 'pending',
      mp_payment_data TEXT DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS owner_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      whatsapp_phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      smtp_host TEXT DEFAULT 'smtp.gmail.com',
      smtp_port INTEGER DEFAULT 587,
      smtp_user TEXT DEFAULT '',
      smtp_pass TEXT DEFAULT '',
      notify_orders INTEGER NOT NULL DEFAULT 1,
      notify_payments INTEGER NOT NULL DEFAULT 1
    );

    INSERT OR IGNORE INTO owner_config (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS connection_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      status TEXT CHECK(status IN ('disconnected','qr','connecting','connected'))
        NOT NULL DEFAULT 'disconnected',
      qr_string TEXT,
      phone TEXT,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    INSERT OR IGNORE INTO connection_state (id, status) VALUES (1, 'disconnected');

    CREATE TABLE IF NOT EXISTS agent_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin','operator')) NOT NULL DEFAULT 'operator'
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      details TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      image_path TEXT DEFAULT '',
      type TEXT CHECK(type IN ('promotion','package')) NOT NULL DEFAULT 'promotion',
      active INTEGER NOT NULL DEFAULT 1,
      details TEXT DEFAULT '[]',
      config TEXT DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // Ensure UNIQUE index on payment_methods.name (for existing DBs created before UNIQUE was added)
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_name ON payment_methods(name);`);

  // Migration: add config column if not exists (for DBs created before this migration)
  try { db.exec(`ALTER TABLE promotions ADD COLUMN config TEXT DEFAULT '{}'`); } catch {}

  // Migration: add Mercado Pago columns to orders
  try { db.exec(`ALTER TABLE orders ADD COLUMN mp_payment_id TEXT DEFAULT ''`); } catch {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'`); } catch {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN mp_payment_data TEXT DEFAULT '{}'`); } catch {}

  // Migration: add Mercado Pago columns to orders
  try { db.exec(`ALTER TABLE orders ADD COLUMN mp_payment_id TEXT DEFAULT ''`); } catch {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'`); } catch {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN mp_payment_data TEXT DEFAULT '{}'`); } catch {}

  seedDefaults(db);

  // Migration: update existing promos with proper config (idempotent — only updates rows with empty config)
  db.exec(`
    UPDATE promotions SET config = '{"pickCount":2,"payCount":1,"eligibleProductIds":[1,2,3,4,5]}'
    WHERE name = '2x1 en Bebidas Calientes' AND (config IS NULL OR config = '{}');
    UPDATE promotions SET config = '{"pickCount":3,"payCount":2,"eligibleProductIds":[7,8,9]}'
    WHERE name = '3x1 en Panaderia' AND (config IS NULL OR config = '{}');
    UPDATE promotions SET config = '{"slots":[{"label":"Bebida Caliente","eligibleProductIds":[1,2,3,4,5],"required":true},{"label":"Panaderia","eligibleProductIds":[7,8,9],"required":true}]}'
    WHERE name = 'Desayuno Completo' AND (config IS NULL OR config = '{}');
    UPDATE promotions SET config = '{"slots":[{"label":"Bebidas","eligibleProductIds":[6,10],"required":true,"maxSelect":2},{"label":"Panaderia","eligibleProductIds":[7,8,9],"required":true,"maxSelect":2}]}'
    WHERE name = 'Combo Amigos' AND (config IS NULL OR config = '{}');
  `);
}

function seedDefaults(db: Database.Database) {
  const configs: [string, string][] = [
    ["burst_delay_ms", "12000"],
    ["temperature", "0.4"],
    ["max_history", "20"],
    ["openai_model", "gpt-4o-mini"],
    ["theme", "dark"],
  ];

  const insertCfg = db.prepare(
    "INSERT OR IGNORE INTO agent_config (key, value) VALUES (?, ?)"
  );
  for (const [k, v] of configs) insertCfg.run(k, v);

  const ownerPhone = process.env.OWNER_WHATSAPP || "";
  if (ownerPhone) {
    db.prepare("UPDATE owner_config SET whatsapp_phone = ? WHERE id = 1").run(ownerPhone);
  }

  const adminHash = process.env.ADMIN_PASS_HASH || "729e5b538ecd3b71f2b87d0a4a5748bd62a32ed2a2b9d23eff7e107312fbd7c1";
  db.prepare(
    "INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, 'admin')"
  ).run("admin", adminHash);

  seedPaymentMethods(db);
  seedCatalog(db);
  seedPromotions(db);
}

function seedPaymentMethods(db: Database.Database) {
  const methods = [
    { name: "Efectivo", enabled: 1, details: JSON.stringify(["Pago directamente en nuestra sucursal al recibir tu pedido."]) },
    { name: "Tarjeta", enabled: 1, details: JSON.stringify(["Paga con tarjeta de credito o debito via Mercado Pago."]) },
    { name: "Transferencia", enabled: 1, details: JSON.stringify(["Banco: BBVA", "Cuenta: 0123456789", "CLABE: 012345678901234567", "Titular: Cafeteria Luna Test"]) },
  ];

  const stmt = db.prepare(
    "INSERT OR IGNORE INTO payment_methods (name, enabled, details) VALUES (?, ?, ?)"
  );
  for (const m of methods) {
    stmt.run(m.name, m.enabled, m.details);
  }
}

// Seed catalog with default coffee shop products
function seedCatalog(db: Database.Database) {
  // Ensure UNIQUE constraint exists (for existing DBs)
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_name_category ON catalog(name, category);`);

  const products = [
    ["Cafe Americano", "Cafe negro clasico, intenso y aromatico", 45, "Bebidas Calientes", "/uploads/catalog/seedream_5_lite_text_to_image_Cafe_Americano.png"],
    ["Latte", "Espresso con leche vaporizada y crema", 55, "Bebidas Calientes", "/uploads/catalog/seedream_5_lite_text_to_image_Latte.png"],
    ["Cappuccino", "Espresso, leche y espuma densa", 55, "Bebidas Calientes", "/uploads/catalog/seedream_5_lite_text_to_image_Cappuccino.png"],
    ["Mocha", "Chocolate con espresso y leche", 60, "Bebidas Calientes", "/uploads/catalog/z_image_Mocha.png"],
    ["Chai Latte", "Te chai especiado con leche", 50, "Bebidas Calientes", "/uploads/catalog/z_image_Chai_Latte.png"],
    ["Matcha Latte", "Te matcha japones con leche", 60, "Bebidas Calientes", "/uploads/catalog/gpt_image_2_text_to_image_Matcha_Latte.png"],
    ["Croissant", "Croissant frances recien horneado", 38, "Panaderia", "/uploads/catalog/flux_2_pro_text_to_image_Croissant.png"],
    ["Bagel", "Bagel clasico con queso crema", 42, "Panaderia", "/uploads/catalog/flux_2_pro_text_to_image_Bagel.png"],
    ["Muffin de Arandano", "Muffin artesanal de arandano", 35, "Panaderia", "/uploads/catalog/seedream_4_5_text_to_image_Muffin_de_Arandano.png"],
    ["Cold Brew", "Cafe infusionado en frio por 18h", 55, "Bebidas Frias", "/uploads/catalog/seedream_4_5_text_to_image_Cold_Brew.png"],
  ];

  const stmt = db.prepare(
    "INSERT OR IGNORE INTO catalog (name, description, price, category, image_path) VALUES (?, ?, ?, ?, ?)"
  );

  for (const [name, desc, price, cat, img] of products) {
    stmt.run(name, desc, price, cat, img);
  }
}

// Seed promotions and packages
function seedPromotions(db: Database.Database) {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_name_type ON promotions(name, type);`);
  const promos = [
    {
      name: "2x1 en Bebidas Calientes",
      description: "Llevate dos bebidas calientes por el precio de una. Valido de lunes a viernes.",
      price: 55,
      type: "promotion",
      image_path: "/uploads/catalog/promo_2x1_bebidas.png",
      details: JSON.stringify(["Valido lunes a viernes", "Elige 2 bebidas calientes y paga solo 1"]),
      config: JSON.stringify({ pickCount: 2, payCount: 1, eligibleProductIds: [1, 2, 3, 4, 5] }),
    },
    {
      name: "3x1 en Panaderia",
      description: "Compra dos piezas de panaderia y llevate la tercera gratis.",
      price: 76,
      type: "promotion",
      image_path: "/uploads/catalog/promo_3x1_panaderia.png",
      details: JSON.stringify(["Valido todos los dias", "Elige 3 piezas y paga solo 2", "Hasta agotar existencias"]),
      config: JSON.stringify({ pickCount: 3, payCount: 2, eligibleProductIds: [7, 8, 9] }),
    },
    {
      name: "Desayuno Completo",
      description: "Bebida caliente + pieza de panaderia a precio especial.",
      price: 75,
      type: "package",
      image_path: "/uploads/catalog/package_desayuno.png",
      details: JSON.stringify(["Ahorro de hasta $20"]),
      config: JSON.stringify({
        slots: [
          { label: "Bebida Caliente", eligibleProductIds: [1, 2, 3, 4, 5], required: true },
          { label: "Panaderia", eligibleProductIds: [7, 8, 9], required: true },
        ],
      }),
    },
    {
      name: "Combo Amigos",
      description: "2 bebidas + 2 piezas de panaderia para compartir.",
      price: 120,
      type: "package",
      image_path: "/uploads/catalog/package_amigos.png",
      details: JSON.stringify(["Precio especial para compartir"]),
      config: JSON.stringify({
        slots: [
          { label: "Bebidas", eligibleProductIds: [6, 10], required: true, maxSelect: 2 },
          { label: "Panaderia", eligibleProductIds: [7, 8, 9], required: true, maxSelect: 2 },
        ],
      }),
    },
  ];

  const stmt = db.prepare(
    "INSERT OR IGNORE INTO promotions (name, description, price, type, image_path, details, config) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  for (const p of promos) {
    stmt.run(p.name, p.description, p.price, p.type, p.image_path, p.details, p.config);
  }
}

// ── Promotions
export function getPromotions(): any[] {
  return getDb()
    .prepare("SELECT * FROM promotions WHERE active = 1 ORDER BY type, id")
    .all()
    .map((p: any) => ({ ...p, details: JSON.parse(p.details || "[]"), config: JSON.parse(p.config || "{}") }));
}

export function getPromotionsAll(): any[] {
  return getDb()
    .prepare("SELECT * FROM promotions ORDER BY type, id")
    .all()
    .map((p: any) => ({ ...p, details: JSON.parse(p.details || "[]"), config: JSON.parse(p.config || "{}") }));
}

export function createPromotion(data: {
  name: string; description: string; price: number;
  type: "promotion" | "package"; imagePath: string; details: string[];
  config: any;
}): number {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO promotions (name, description, price, type, image_path, details, config) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(data.name, data.description, data.price, data.type, data.imagePath, JSON.stringify(data.details), JSON.stringify(data.config || {}));
  return Number(result.lastInsertRowid);
}

export function updatePromotion(id: number, data: {
  name?: string; description?: string; price?: number;
  type?: string; imagePath?: string; details?: string[];
  config?: any;
  active?: number;
}) {
  const current = getDb().prepare("SELECT * FROM promotions WHERE id = ?").get(id) as any;
  if (!current) return;

  getDb().prepare(
    "UPDATE promotions SET name=?, description=?, price=?, type=?, image_path=?, details=?, config=?, active=?, updated_at=unixepoch() WHERE id=?"
  ).run(
    data.name ?? current.name,
    data.description ?? current.description,
    data.price ?? current.price,
    data.type ?? current.type,
    data.imagePath ?? current.image_path,
    data.details ? JSON.stringify(data.details) : current.details,
    data.config ? JSON.stringify(data.config) : current.config,
    data.active !== undefined ? data.active : current.active,
    id
  );
}

export function deletePromotion(id: number) {
  getDb().prepare("UPDATE promotions SET active = 0 WHERE id = ?").run(id);
}

export function upsertConversation(phone: string, name?: string) {
  const db = getDb();
  db.prepare(
    `INSERT INTO conversations (phone, name, created_at)
     VALUES (?, ?, unixepoch())
     ON CONFLICT(phone) DO UPDATE SET name = COALESCE(?, name)`
  ).run(phone, name ?? null, name ?? null);
}

export function getConversationByPhone(phone: string): any {
  return getDb().prepare("SELECT * FROM conversations WHERE phone = ?").get(phone);
}

export function getConversations(): any[] {
  return getDb()
    .prepare(
      `SELECT c.*, m.content AS last_message, m.role AS last_role
       FROM conversations c
       LEFT JOIN (
         SELECT conv_id, content, role
         FROM messages
         WHERE id IN (SELECT MAX(id) FROM messages GROUP BY conv_id)
       ) m ON m.conv_id = c.id
       ORDER BY c.created_at DESC`
    )
    .all();
}

export function getConversationById(id: number): any {
  return getDb().prepare("SELECT * FROM conversations WHERE id = ?").get(id);
}

export function deleteConversation(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM messages WHERE conv_id = ?").run(id);
  db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
}

export function setConversationMode(id: number, mode: "AI" | "HUMAN") {
  getDb().prepare("UPDATE conversations SET mode = ? WHERE id = ?").run(mode, id);
}

export function setConversationName(phone: string, name: string) {
  getDb().prepare("UPDATE conversations SET name = ? WHERE phone = ?").run(name, phone);
}

export function addTagToConversation(phone: string, tag: string) {
  const conv = getConversationByPhone(phone);
  if (!conv) return;
  const existing = conv.tags ? conv.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
  if (!existing.includes(tag)) {
    existing.push(tag);
    getDb().prepare("UPDATE conversations SET tags = ? WHERE phone = ?")
      .run(existing.join(","), phone);
  }
}

// ── Messages

export function insertMessage(
  convId: number,
  role: "user" | "assistant" | "human",
  content: string,
  mediaPath?: string
) {
  getDb()
    .prepare("INSERT INTO messages (conv_id, role, content, media_path) VALUES (?, ?, ?, ?)")
    .run(convId, role, content, mediaPath ?? null);
}

export function getMessages(convId: number, limit = 50): any[] {
  return getDb()
    .prepare("SELECT * FROM messages WHERE conv_id = ? ORDER BY created_at ASC LIMIT ?")
    .all(convId, limit);
}

// ── Catalog

export function getCatalog(): any[] {
  return getDb().prepare("SELECT * FROM catalog WHERE active = 1 ORDER BY category, name").all();
}

export function getCatalogAll(): any[] {
  return getDb().prepare("SELECT * FROM catalog ORDER BY category, name").all();
}

export function getCatalogItem(id: number): any {
  return getDb().prepare("SELECT * FROM catalog WHERE id = ?").get(id);
}

export function createCatalogItem(
  name: string, description: string, price: number, category: string, imagePath: string
): number {
  const result = getDb()
    .prepare(
      `INSERT INTO catalog (name, description, price, category, image_path, updated_at)
       VALUES (?, ?, ?, ?, ?, unixepoch())`
    )
    .run(name, description, price, category, imagePath);
  return Number(result.lastInsertRowid);
}

export function updateCatalogItem(
  id: number, name: string, description: string,
  price: number, category: string, imagePath?: string
) {
  if (imagePath) {
    getDb()
      .prepare(
        `UPDATE catalog SET name=?, description=?, price=?, category=?, image_path=?, updated_at=unixepoch()
         WHERE id=?`
      )
      .run(name, description, price, category, imagePath, id);
  } else {
    getDb()
      .prepare(
        `UPDATE catalog SET name=?, description=?, price=?, category=?, updated_at=unixepoch()
         WHERE id=?`
      )
      .run(name, description, price, category, id);
  }
}

export function deleteCatalogItem(id: number) {
  getDb().prepare("UPDATE catalog SET active = 0, updated_at = unixepoch() WHERE id = ?").run(id);
}

export function searchCatalog(query: string): any[] {
  const q = `%${query.toLowerCase()}%`;
  return getDb()
    .prepare(
      `SELECT * FROM catalog WHERE active = 1 AND (
        LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(category) LIKE ?
      ) ORDER BY name`
    )
    .all(q, q, q);
}

// ── Orders

export function createOrder(phone: string, items: any[], total: number, paymentMethod: string, notes?: string, mpPaymentId?: string, paymentStatus?: string, mpPaymentData?: any): number {
  const result = getDb()
    .prepare("INSERT INTO orders (phone, items, total, payment_method, notes, mp_payment_id, payment_status, mp_payment_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(phone, JSON.stringify(items), total, paymentMethod, notes ?? "", mpPaymentId ?? "", paymentStatus ?? "pending", JSON.stringify(mpPaymentData ?? {}));
  return Number(result.lastInsertRowid);
}

export function getOrders(): any[] {
  return getDb()
    .prepare("SELECT * FROM orders ORDER BY created_at DESC")
    .all()
    .map((o: any) => ({ ...o, items: JSON.parse(o.items || "[]") }));
}

export function getOrdersByPhone(phone: string): any[] {
  return getDb()
    .prepare("SELECT * FROM orders WHERE phone = ? ORDER BY created_at DESC")
    .all(phone)
    .map((o: any) => ({ ...o, items: JSON.parse(o.items || "[]") }));
}

export function getOrderById(id: number): any {
  const order = getDb().prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
  if (!order) return null;
  return { ...order, items: JSON.parse(order.items || "[]") };
}

export function updateOrderStatus(id: number, status: "pending" | "preparing" | "delivered" | "cancelled" | "expirado") {
  getDb().prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
}

export function updateOrderPayment(orderId: number, mpPaymentId: string, paymentStatus: string, mpPaymentData?: any) {
  getDb()
    .prepare("UPDATE orders SET mp_payment_id = ?, payment_status = ?, mp_payment_data = ? WHERE id = ?")
    .run(mpPaymentId, paymentStatus, JSON.stringify(mpPaymentData ?? {}), orderId);
}

export function getOrderByMpPaymentId(mpPaymentId: string): any {
  const order = getDb().prepare("SELECT * FROM orders WHERE mp_payment_id = ?").get(mpPaymentId) as any;
  if (!order) return null;
  return { ...order, items: JSON.parse(order.items || "[]"), mp_payment_data: JSON.parse(order.mp_payment_data || "{}") };
}

export function getOrdersStats(): any {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as c FROM orders").get() as any).c;
  const hoy = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE date(created_at, 'unixepoch') = date('now')").get() as any).c;
  const pendientes = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get() as any).c;
  const ingresosHoy = (db.prepare("SELECT COALESCE(SUM(total),0) as t FROM orders WHERE status != 'cancelled' AND date(created_at, 'unixepoch') = date('now')").get() as any).t;
  return { total, hoy, pendientes, ingresos_hoy: ingresosHoy };
}

// ── Owner Config

export function getOwnerConfig(): any {
  return getDb().prepare("SELECT * FROM owner_config WHERE id = 1").get();
}

export function updateOwnerConfig(config: {
  whatsapp_phone?: string; email?: string; smtp_host?: string;
  smtp_port?: number; smtp_user?: string; smtp_pass?: string;
  notify_orders?: number; notify_payments?: number;
}) {
  const current = getOwnerConfig();
  getDb()
    .prepare(
      `UPDATE owner_config SET whatsapp_phone=?, email=?, smtp_host=?, smtp_port=?,
       smtp_user=?, smtp_pass=?, notify_orders=?, notify_payments=? WHERE id=1`
    )
    .run(
      config.whatsapp_phone ?? current.whatsapp_phone,
      config.email ?? current.email,
      config.smtp_host ?? current.smtp_host,
      config.smtp_port ?? current.smtp_port,
      config.smtp_user ?? current.smtp_user,
      config.smtp_pass ?? current.smtp_pass,
      config.notify_orders ?? current.notify_orders,
      config.notify_payments ?? current.notify_payments
    );
}

// ── Connection State

export function getConnectionState(): {
  status: string; qrString: string | null; phone: string | null;
} | null {
  const row = getDb()
    .prepare("SELECT status, qr_string, phone FROM connection_state WHERE id = 1")
    .get() as any;
  if (!row) return null;
  return { status: row.status, qrString: row.qr_string ?? null, phone: row.phone ?? null };
}

export function setConnectionState(state: {
  status: string; qrString?: string | null; phone?: string | null;
}) {
  getDb()
    .prepare(
      `UPDATE connection_state SET status=?, qr_string=?, phone=?, updated_at=unixepoch() WHERE id=1`
    )
    .run(state.status, state.qrString ?? null, state.phone ?? null);
}

// ── Agent Config

export function getAgentValue(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM agent_config WHERE key = ?").get(key) as any;
  return row?.value ?? null;
}

export function setAgentValue(key: string, value: string) {
  getDb()
    .prepare("INSERT INTO agent_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?")
    .run(key, value, value);
}

export function getAgentConfig(): Record<string, string> {
  const rows = getDb().prepare("SELECT key, value FROM agent_config").all() as any[];
  const config: Record<string, string> = {};
  for (const row of rows) config[row.key] = row.value;
  return config;
}

// ── Users

export function getUserByUsername(username: string): any {
  return getDb().prepare("SELECT * FROM users WHERE username = ?").get(username);
}

// ── Payment Methods

export function getPaymentMethods(): any[] {
  return getDb()
    .prepare("SELECT * FROM payment_methods ORDER BY id ASC")
    .all()
    .map((m: any) => ({ ...m, details: JSON.parse(m.details || "[]") }));
}

export function getEnabledPaymentMethods(): any[] {
  return getDb()
    .prepare("SELECT * FROM payment_methods WHERE enabled = 1 ORDER BY id ASC")
    .all()
    .map((m: any) => ({ ...m, details: JSON.parse(m.details || "[]") }));
}

export function updatePaymentMethod(id: number, data: { name?: string; enabled?: number; details?: string[] }) {
  const current = getDb().prepare("SELECT * FROM payment_methods WHERE id = ?").get(id) as any;
  if (!current) return;

  getDb()
    .prepare(
      "UPDATE payment_methods SET name = ?, enabled = ?, details = ?, updated_at = unixepoch() WHERE id = ?"
    )
    .run(
      data.name ?? current.name,
      data.enabled !== undefined ? data.enabled : current.enabled,
      data.details ? JSON.stringify(data.details) : current.details,
      id
    );
}

export function getPaymentMethodById(id: number): any {
  const m = getDb().prepare("SELECT * FROM payment_methods WHERE id = ?").get(id) as any;
  if (!m) return null;
  return { ...m, details: JSON.parse(m.details || "[]") };
}

export function createPaymentMethod(name: string, enabled: number, details: string[]): number {
  const result = getDb()
    .prepare("INSERT INTO payment_methods (name, enabled, details) VALUES (?, ?, ?)")
    .run(name, enabled, JSON.stringify(details));
  return Number(result.lastInsertRowid);
}
