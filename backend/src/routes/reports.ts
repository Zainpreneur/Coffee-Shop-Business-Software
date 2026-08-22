import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/summary", requireAuth, (_req, res) => {
  const today = db
    .prepare(
      `SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as orders
       FROM orders WHERE status='completed' AND date(created_at) = date('now')`
    )
    .get() as any;

  const last7 = db
    .prepare(
      `SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as orders
       FROM orders WHERE status='completed' AND date(created_at) >= date('now','-6 days')`
    )
    .get() as any;

  const allTime = db
    .prepare(`SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as orders FROM orders WHERE status='completed'`)
    .get() as any;

  const lowStockCount = db
    .prepare(`SELECT COUNT(*) as c FROM inventory_items WHERE quantity_on_hand <= reorder_level`)
    .get() as any;

  const customerCount = db.prepare(`SELECT COUNT(*) as c FROM customers`).get() as any;

  res.json({
    today,
    last7Days: last7,
    allTime,
    lowStockCount: lowStockCount.c,
    customerCount: customerCount.c,
  });
});

router.get("/revenue-by-day", requireAuth, (req, res) => {
  const days = Math.min(Number(req.query.days) || 14, 90);
  const rows = db
    .prepare(
      `SELECT date(created_at) as day, COALESCE(SUM(total),0) as revenue, COUNT(*) as orders
       FROM orders
       WHERE status='completed' AND date(created_at) >= date('now', ?)
       GROUP BY date(created_at)
       ORDER BY day`
    )
    .all(`-${days - 1} days`);
  res.json(rows);
});

router.get("/top-items", requireAuth, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 8, 50);
  const rows = db
    .prepare(
      `SELECT oi.name, SUM(oi.quantity) as quantity_sold, SUM(oi.quantity * oi.unit_price) as revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'completed'
       GROUP BY oi.name
       ORDER BY quantity_sold DESC
       LIMIT ?`
    )
    .all(limit);
  res.json(rows);
});

router.get("/low-stock", requireAuth, (_req, res) => {
  const rows = db
    .prepare(`SELECT * FROM inventory_items WHERE quantity_on_hand <= reorder_level ORDER BY name`)
    .all();
  res.json(rows);
});

router.get("/payment-methods", requireAuth, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT payment_method, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue
       FROM orders WHERE status='completed' GROUP BY payment_method`
    )
    .all();
  res.json(rows);
});

export default router;
