import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, requireRole("admin", "manager"), (_req, res) => {
  const rows = db
    .prepare("SELECT id, name, email, role, active, created_at FROM users ORDER BY name")
    .all();
  res.json(rows);
});

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "manager", "cashier"]),
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, password, role } = parsed.data;
  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
      .run(name, email, hash, role);
    res.status(201).json({ id: info.lastInsertRowid, name, email, role });
  } catch {
    res.status(409).json({ error: "A user with that email already exists" });
  }
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "manager", "cashier"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

router.put("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "Not found" });

  const data = parsed.data;
  db.prepare("UPDATE users SET name=?, role=?, active=? WHERE id=?").run(
    data.name ?? existing.name,
    data.role ?? existing.role,
    data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
    req.params.id
  );
  if (data.password) {
    const hash = bcrypt.hashSync(data.password, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, req.params.id);
  }
  res.json({ ok: true });
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  if (Number(req.params.id) === req.user!.id) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
