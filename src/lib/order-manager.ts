import {
  createOrder, getOrderById, getOrders, getOrdersByPhone,
  updateOrderStatus, getOrdersStats,
} from "./db";
import { notifyOwnerNewOrder } from "./notify-owner";

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export async function createNewOrder(
  phone: string,
  items: OrderItem[],
  paymentMethod: string,
  notes?: string
): Promise<number | null> {
  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderId = createOrder(phone, items, total, paymentMethod, notes);

  try {
    await notifyOwnerNewOrder(orderId, "Cafeteria Luna Test");
  } catch (err) {
    console.error("[order-manager] error notificando:", err);
  }

  return orderId;
}

export function getOrderSummary(orderId: number): any {
  const order = getOrderById(orderId);
  if (!order) return null;

  const items = order.items
    .map((i: any) => ` ${i.name} x${i.quantity} — $${(i.price * i.quantity).toFixed(0)}`)
    .join("\n");

  return {
    ...order,
    itemsText: items,
    summary: `*Pedido #${order.id}*\n${items}\n*Total: $${order.total.toFixed(0)}*\nEstado: ${order.status}\nMetodo de pago: ${order.payment_method || "No especificado"}`,
  };
}

export function getAllOrders() {
  return getOrders();
}

export function getClientOrders(phone: string) {
  return getOrdersByPhone(phone);
}

export async function changeOrderStatus(
  orderId: number,
  status: "pending" | "preparing" | "delivered" | "cancelled"
) {
  updateOrderStatus(orderId, status);
  return getOrderById(orderId);
}

export function getStats() {
  return getOrdersStats();
}
