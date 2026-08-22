import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  if (q) {
    const rows = db
      .prepare(`SELECT * FROM customers WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY name`)
      .all(`%${q}%`, `%${q}%`, `%${q}%`);
    return res.json(rows);
  }
  const rows = db.prepare("SELECT * FROM customers ORDER BY name").all();
  res.json(rows);
});

router.get("/:id", requireAuth, (req, res) => {
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
  if (!customer) return res.status(404).json({ error: "Not found" });
  const orders = db
    .prepare("SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20")
    .all(req.params.id);
  res.json({ ...customer, orders });
});

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")).optional(),
  phone: z.string().optional(),
});

router.post("/", requireAuth, (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, phone } = parsed.data;
  const info = db
    .prepare("INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)")
    .run(name, email || null, phone || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put("/:id", requireAuth, (req, res) => {
  const parsed = customerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "Not found" });
  const data = { ...existing, ...parsed.data };
  db.prepare("UPDATE customers SET name=?, email=?, phone=? WHERE id=?").run(
    data.name,
    data.email || null,
    data.phone || null,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete("/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
