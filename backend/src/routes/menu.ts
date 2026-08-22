import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// ---- Categories ----

router.get("/categories", requireAuth, (_req, res) => {
  const rows = db.prepare("SELECT * FROM categories ORDER BY sort_order, name").all();
  res.json(rows);
});

const categorySchema = z.object({
  name: z.string().min(1),
  sort_order: z.number().int().optional(),
});

router.post("/categories", requireAuth, requireRole("admin", "manager"), (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, sort_order = 0 } = parsed.data;
  try {
    const info = db.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)").run(name, sort_order);
    res.status(201).json({ id: info.lastInsertRowid, name, sort_order });
  } catch (e) {
    res.status(409).json({ error: "Category already exists" });
  }
});

router.put("/categories/:id", requireAuth, requireRole("admin", "manager"), (req, res) => {
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = { ...existing, ...parsed.data };
  db.prepare("UPDATE categories SET name = ?, sort_order = ? WHERE id = ?").run(
    updated.name,
    updated.sort_order,
    req.params.id
  );
  res.json(updated);
});

router.delete("/categories/:id", requireAuth, requireRole("admin", "manager"), (req, res) => {
  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

// ---- Menu items ----

router.get("/items", requireAuth, (req, res) => {
  const includeInactive = req.query.all === "1";
  const rows = db
    .prepare(
      `SELECT m.*, c.name as category_name
       FROM menu_items m
       LEFT JOIN categories c ON c.id = m.category_id
       ${includeInactive ? "" : "WHERE m.is_active = 1"}
       ORDER BY c.sort_order, m.name`
    )
    .all();
  res.json(rows);
});

router.get("/items/:id", requireAuth, (req, res) => {
  const item = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });
  const recipe = db
    .prepare(
      `SELECT r.*, i.name as inventory_name, i.unit
       FROM recipe_items r JOIN inventory_items i ON i.id = r.inventory_item_id
       WHERE r.menu_item_id = ?`
    )
    .all(req.params.id);
  res.json({ ...item, recipe });
});

const menuItemSchema = z.object({
  category_id: z.number().int().nullable().optional(),
  name: z.string().min(1),
  description: z.string().optional().default(""),
  price: z.number().nonnegative(),
  is_active: z.boolean().optional().default(true),
  image_emoji: z.string().optional().default("☕"),
  recipe: z
    .array(z.object({ inventory_item_id: z.number().int(), quantity_used: z.number().positive() }))
    .optional()
    .default([]),
});

router.post("/items", requireAuth, requireRole("admin", "manager"), (req, res) => {
  const parsed = menuItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { category_id, name, description, price, is_active, image_emoji, recipe } = parsed.data;

  const insert = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO menu_items (category_id, name, description, price, is_active, image_emoji)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(category_id ?? null, name, description, price, is_active ? 1 : 0, image_emoji);
    const menuItemId = info.lastInsertRowid as number;
    const insertRecipe = db.prepare(
      "INSERT INTO recipe_items (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)"
    );
    for (const r of recipe) insertRecipe.run(menuItemId, r.inventory_item_id, r.quantity_used);
    return menuItemId;
  });

  const id = insert();
  res.status(201).json({ id });
});

router.put("/items/:id", requireAuth, requireRole("admin", "manager"), (req, res) => {
  const parsed = menuItemSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "Not found" });

  const data = parsed.data;
  const update = db.transaction(() => {
    db.prepare(
      `UPDATE menu_items SET category_id = ?, name = ?, description = ?, price = ?, is_active = ?, image_emoji = ?
       WHERE id = ?`
    ).run(
      data.category_id !== undefined ? data.category_id : existing.category_id,
      data.name ?? existing.name,
      data.description ?? existing.description,
      data.price ?? existing.price,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active,
      data.image_emoji ?? existing.image_emoji,
      req.params.id
    );
    if (data.recipe) {
      db.prepare("DELETE FROM recipe_items WHERE menu_item_id = ?").run(req.params.id);
      const insertRecipe = db.prepare(
        "INSERT INTO recipe_items (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)"
      );
      for (const r of data.recipe) insertRecipe.run(req.params.id, r.inventory_item_id, r.quantity_used);
    }
  });
  update();
  res.json({ ok: true });
});

router.delete("/items/:id", requireAuth, requireRole("admin", "manager"), (req, res) => {
  db.prepare("DELETE FROM menu_items WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
