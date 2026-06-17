"use client";

import { useState, useEffect, useCallback } from "react";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  phone: string;
  items: OrderItem[];
  total: number;
  payment_method: string;
  status: "pending" | "preparing" | "delivered" | "cancelled";
  notes: string;
  created_at: number;
}

interface OrderStats {
  total: number;
  hoy: number;
  pendientes: number;
  ingresos_hoy: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
  preparing: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  delivered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  preparing: "Preparando",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export default function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    total: 0, hoy: 0, pendientes: 0, ingresos_hoy: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
      if (data.stats) setStats(data.stats);
    } catch {}
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const changeStatus = async (orderId: number, status: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: status as any } : null);
      }
    } catch (err) {
      console.error("Error actualizando estado:", err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          ["Total Pedidos", stats.total, "text-white"],
          ["Hoy", stats.hoy, "text-emerald-400"],
          ["Pendientes", stats.pendientes, "text-yellow-400"],
          ["Ingresos Hoy", "$" + (stats.ingresos_hoy || 0).toFixed(0), "text-blue-400"],
        ].map(([label, value, color]) => (
          <div key={label as string} className="glass-card p-4 text-center">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Pedidos Recientes</h2>
          <div className="space-y-2">
            {orders.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-8">Aun no hay pedidos</p>
            )}
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`w-full text-left glass-card p-4 hover:border-emerald-500/30 transition-all ${
                  selectedOrder?.id === order.id ? "border-emerald-500/50 bg-emerald-500/5" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-mono font-medium text-[var(--text-primary)]">#{order.id}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-2">{order.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-emerald-400">${order.total.toFixed(0)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  {new Date(order.created_at * 1000).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        {selectedOrder && (
          <div className="w-80 shrink-0">
            <div className="glass-card p-5 sticky top-6">
              <h3 className="text-sm font-semibold mb-4">Pedido #{selectedOrder.id}</h3>
              <div className="space-y-3 text-sm">
                <div><span className="text-[var(--text-muted)] text-xs">Cliente:</span><p className="text-[var(--text-primary)]">{selectedOrder.phone}</p></div>
                <div><span className="text-[var(--text-muted)] text-xs">Metodo de pago:</span><p className="text-[var(--text-primary)]">{selectedOrder.payment_method || "No especificado"}</p></div>
                <div>
                  <span className="text-[var(--text-muted)] text-xs">Items:</span>
                  <ul className="mt-1 space-y-1">
                    {selectedOrder.items.map((item, i) => (
                      <li key={i} className="flex justify-between text-[var(--text-primary)]">
                        <span>{item.name} x{item.quantity}</span>
                        <span className="text-[var(--text-secondary)]">${(item.price * item.quantity).toFixed(0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-[var(--border-color)] pt-2 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-emerald-400">${selectedOrder.total.toFixed(0)}</span>
                </div>
                {selectedOrder.notes && (
                  <div><span className="text-[var(--text-muted)] text-xs">Notas:</span><p className="text-[var(--text-secondary)] text-xs mt-0.5">{selectedOrder.notes}</p></div>
                )}
                <div className="border-t border-[var(--border-color)] pt-3">
                  <span className="text-[var(--text-muted)] text-xs block mb-2">Cambiar estado:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["pending", "preparing", "delivered", "cancelled"] as const).map((s) => (
                      <button key={s} onClick={() => changeStatus(selectedOrder.id, s)}
                        className={`py-1.5 text-[11px] rounded-lg font-medium transition-all border ${
                          selectedOrder.status === s ? STATUS_COLORS[s] : "border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                        }`}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
