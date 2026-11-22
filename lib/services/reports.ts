import { db } from "@/lib/db";
import type { InventoryItem, RevenueDay, TopItem } from "@/lib/types";

export function summary() {
  const today = db
    .prepare(
      `SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as orders
       FROM orders WHERE status='completed' AND date(created_at) = date('now')`
    )
    .get() as { revenue: number; orders: number };

  const last7 = db
    .prepare(
      `SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as orders
       FROM orders WHERE status='completed' AND date(created_at) >= date('now','-6 days')`
    )
    .get() as { revenue: number; orders: number };

  const allTime = db
    .prepare(`SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as orders FROM orders WHERE status='completed'`)
    .get() as { revenue: number; orders: number };

  const lowStockCount = db
    .prepare(`SELECT COUNT(*) as c FROM inventory_items WHERE quantity_on_hand <= reorder_level`)
    .get() as { c: number };

  const customerCount = db.prepare(`SELECT COUNT(*) as c FROM customers`).get() as { c: number };

  return {
    today,
    last7Days: last7,
    allTime,
    lowStockCount: lowStockCount.c,
    customerCount: customerCount.c,
  };
}

export function revenueByDay(days: number) {
  const bounded = Math.min(Math.max(days || 14, 1), 90);
  return db
    .prepare(
      `SELECT date(created_at) as day, COALESCE(SUM(total),0) as revenue, COUNT(*) as orders
       FROM orders
       WHERE status='completed' AND date(created_at) >= date('now', ?)
       GROUP BY date(created_at)
       ORDER BY day`
    )
    .all(`-${bounded - 1} days`) as RevenueDay[];
}

export function topItems(limit: number) {
  const bounded = Math.min(Math.max(limit || 8, 1), 50);
  return db
    .prepare(
      `SELECT oi.name, SUM(oi.quantity) as quantity_sold, SUM(oi.quantity * oi.unit_price) as revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'completed'
       GROUP BY oi.name
       ORDER BY quantity_sold DESC
       LIMIT ?`
    )
    .all(bounded) as TopItem[];
}

export function lowStock() {
  return db
    .prepare(`SELECT * FROM inventory_items WHERE quantity_on_hand <= reorder_level ORDER BY name`)
    .all() as InventoryItem[];
}

export function paymentMethods() {
  return db
    .prepare(
      `SELECT payment_method, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue
       FROM orders WHERE status='completed' GROUP BY payment_method`
    )
    .all();
}
