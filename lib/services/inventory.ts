import { z } from "zod";
import { ApiError, parse } from "@/lib/api";
import { db } from "@/lib/db";

const inventorySchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  quantity_on_hand: z.number().nonnegative().default(0),
  reorder_level: z.number().nonnegative().default(0),
  cost_per_unit: z.number().nonnegative().default(0),
});

const adjustSchema = z.object({
  change_qty: z.number(),
  reason: z.string().min(1),
});

export function listInventory(lowOnly: boolean) {
  return db
    .prepare(
      `SELECT * FROM inventory_items ${lowOnly ? "WHERE quantity_on_hand <= reorder_level" : ""} ORDER BY name`
    )
    .all();
}

export function createInventory(input: unknown) {
  const { name, unit, quantity_on_hand, reorder_level, cost_per_unit } = parse(inventorySchema, input);
  try {
    const info = db
      .prepare(
        `INSERT INTO inventory_items (name, unit, quantity_on_hand, reorder_level, cost_per_unit) VALUES (?, ?, ?, ?, ?)`
      )
      .run(name, unit, quantity_on_hand, reorder_level, cost_per_unit);
    return { id: Number(info.lastInsertRowid) };
  } catch {
    throw new ApiError(409, "Inventory item already exists");
  }
}

export function updateInventory(id: number, input: unknown) {
  const data = parse(inventorySchema.partial(), input);
  const existing = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(id) as Record<string, any> | undefined;
  if (!existing) throw new ApiError(404, "Not found");

  const values = { ...existing, ...data };
  db.prepare(
    `UPDATE inventory_items SET name=?, unit=?, quantity_on_hand=?, reorder_level=?, cost_per_unit=?, updated_at=datetime('now') WHERE id=?`
  ).run(values.name, values.unit, values.quantity_on_hand, values.reorder_level, values.cost_per_unit, id);
  return { ok: true };
}

export function deleteInventory(id: number) {
  db.prepare("DELETE FROM inventory_items WHERE id = ?").run(id);
}

export function adjustInventory(id: number, input: unknown, userId: number) {
  const { change_qty, reason } = parse(adjustSchema, input);
  const item = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(id) as { quantity_on_hand: number } | undefined;
  if (!item) throw new ApiError(404, "Not found");

  const newQty = item.quantity_on_hand + change_qty;
  if (newQty < 0) throw new ApiError(400, "Adjustment would result in negative stock");

  db.transaction(() => {
    db.prepare(`UPDATE inventory_items SET quantity_on_hand = ?, updated_at = datetime('now') WHERE id = ?`).run(newQty, id);
    db.prepare(
      `INSERT INTO stock_movements (inventory_item_id, change_qty, reason, created_by) VALUES (?, ?, ?, ?)`
    ).run(id, change_qty, reason, userId);
  })();

  return { ok: true, quantity_on_hand: newQty };
}

export function listMovements(id: number) {
  return db
    .prepare(
      `SELECT sm.*, u.name as user_name FROM stock_movements sm
       LEFT JOIN users u ON u.id = sm.created_by
       WHERE inventory_item_id = ? ORDER BY sm.created_at DESC LIMIT 100`
    )
    .all(id);
}
