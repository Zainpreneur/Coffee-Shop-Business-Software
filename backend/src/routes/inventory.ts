import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const lowOnly = req.query.low === "1";
  const rows = db
    .prepare(
      `SELECT * FROM inventory_items ${lowOnly ? "WHERE quantity_on_hand <= reorder_level" : ""} ORDER BY name`
    )
    .all();
  res.json(rows);
});

const invSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  quantity_on_hand: z.number().nonnegative().default(0),
  reorder_level: z.number().nonnegative().default(0),
  cost_per_unit: z.number().nonnegative().default(0),
});

router.post("/", requireAuth, requireRole("admin", "manager"), (req, res) => {
  const parsed = invSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, unit, quantity_on_hand, reorder_level, cost_per_unit } = parsed.data;
  try {
    const info = db
      .prepare(
        `INSERT INTO inventory_items (name, unit, quantity_on_hand, reorder_level, cost_per_unit) VALUES (?, ?, ?, ?, ?)`
      )
      .run(name, unit, quantity_on_hand, reorder_level, cost_per_unit);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch {
    res.status(409).json({ error: "Inventory item already exists" });
  }
});

router.put("/:id", requireAuth, requireRole("admin", "manager"), (req, res) => {
  const parsed = invSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "Not found" });
  const data = { ...existing, ...parsed.data };
  db.prepare(
    `UPDATE inventory_items SET name=?, unit=?, quantity_on_hand=?, reorder_level=?, cost_per_unit=?, updated_at=datetime('now') WHERE id=?`
  ).run(data.name, data.unit, data.quantity_on_hand, data.reorder_level, data.cost_per_unit, req.params.id);
  res.json({ ok: true });
});

router.delete("/:id", requireAuth, requireRole("admin", "manager"), (req, res) => {
  db.prepare("DELETE FROM inventory_items WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

const adjustSchema = z.object({
  change_qty: z.number(),
  reason: z.string().min(1),
});

router.post("/:id/adjust", requireAuth, requireRole("admin", "manager"), (req, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const item = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(req.params.id) as any;
  if (!item) return res.status(404).json({ error: "Not found" });

  const { change_qty, reason } = parsed.data;
  const newQty = item.quantity_on_hand + change_qty;
  if (newQty < 0) return res.status(400).json({ error: "Adjustment would result in negative stock" });

  const run = db.transaction(() => {
    db.prepare(`UPDATE inventory_items SET quantity_on_hand = ?, updated_at = datetime('now') WHERE id = ?`).run(
      newQty,
      req.params.id
    );
    db.prepare(
      `INSERT INTO stock_movements (inventory_item_id, change_qty, reason, created_by) VALUES (?, ?, ?, ?)`
    ).run(req.params.id, change_qty, reason, req.user!.id);
  });
  run();
  res.json({ ok: true, quantity_on_hand: newQty });
});

router.get("/:id/movements", requireAuth, requireRole("admin", "manager"), (req, res) => {
  const rows = db
    .prepare(
      `SELECT sm.*, u.name as user_name FROM stock_movements sm
       LEFT JOIN users u ON u.id = sm.created_by
       WHERE inventory_item_id = ? ORDER BY sm.created_at DESC LIMIT 100`
    )
    .all(req.params.id);
  res.json(rows);
});

export default router;
