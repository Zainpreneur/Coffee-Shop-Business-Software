import { z } from "zod";
import { ApiError, parse } from "@/lib/api";
import { db } from "@/lib/db";

const categorySchema = z.object({
  name: z.string().min(1),
  sort_order: z.number().int().optional(),
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

export function listCategories() {
  return db.prepare("SELECT * FROM categories ORDER BY sort_order, name").all();
}

export function createCategory(input: unknown) {
  const { name, sort_order = 0 } = parse(categorySchema, input);
  try {
    const info = db.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)").run(name, sort_order);
    return { id: Number(info.lastInsertRowid), name, sort_order };
  } catch {
    throw new ApiError(409, "Category already exists");
  }
}

export function updateCategory(id: number, input: unknown) {
  const data = parse(categorySchema.partial(), input);
  const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!existing) throw new ApiError(404, "Not found");

  const name = data.name ?? (existing.name as string);
  const sortOrder = data.sort_order ?? (existing.sort_order as number);
  db.prepare("UPDATE categories SET name = ?, sort_order = ? WHERE id = ?").run(name, sortOrder, id);
  return { ...existing, ...data, id };
}

export function deleteCategory(id: number) {
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
}

export function listItems(includeInactive: boolean) {
  return db
    .prepare(
      `SELECT m.*, c.name as category_name
       FROM menu_items m
       LEFT JOIN categories c ON c.id = m.category_id
       ${includeInactive ? "" : "WHERE m.is_active = 1"}
       ORDER BY c.sort_order, m.name`
    )
    .all();
}

export function getItem(id: number) {
  const item = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(id);
  if (!item) throw new ApiError(404, "Not found");
  const recipe = db
    .prepare(
      `SELECT r.*, i.name as inventory_name, i.unit
       FROM recipe_items r JOIN inventory_items i ON i.id = r.inventory_item_id
       WHERE r.menu_item_id = ?`
    )
    .all(id);
  return { ...item, recipe };
}

export function createItem(input: unknown) {
  const { category_id, name, description, price, is_active, image_emoji, recipe = [] } = parse(menuItemSchema, input);

  const insert = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO menu_items (category_id, name, description, price, is_active, image_emoji)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(category_id ?? null, name, description, price, is_active ? 1 : 0, image_emoji);
    const menuItemId = Number(info.lastInsertRowid);
    const insertRecipe = db.prepare(
      "INSERT INTO recipe_items (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)"
    );
    for (const r of recipe) insertRecipe.run(menuItemId, r.inventory_item_id, r.quantity_used);
    return menuItemId;
  });

  return { id: insert() };
}

export function updateItem(id: number, input: unknown) {
  const data = parse(menuItemSchema.partial(), input);
  const existing = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(id) as Record<string, any> | undefined;
  if (!existing) throw new ApiError(404, "Not found");

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
      id
    );
    if (data.recipe) {
      db.prepare("DELETE FROM recipe_items WHERE menu_item_id = ?").run(id);
      const insertRecipe = db.prepare(
        "INSERT INTO recipe_items (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)"
      );
      for (const r of data.recipe) insertRecipe.run(id, r.inventory_item_id, r.quantity_used);
    }
  });
  update();
  return { ok: true };
}

export function deleteItem(id: number) {
  db.prepare("DELETE FROM menu_items WHERE id = ?").run(id);
}
