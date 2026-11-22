import bcrypt from "bcryptjs";
import { z } from "zod";
import { ApiError, parse } from "@/lib/api";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "manager", "cashier"]),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "manager", "cashier"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export function listEmployees() {
  return db.prepare("SELECT id, name, email, role, active, created_at FROM users ORDER BY name").all();
}

export function createEmployee(input: unknown) {
  const { name, email, password, role } = parse(createSchema, input);
  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
      .run(name, email, hash, role);
    return { id: Number(info.lastInsertRowid), name, email, role };
  } catch {
    throw new ApiError(409, "A user with that email already exists");
  }
}

export function updateEmployee(id: number, input: unknown) {
  const data = parse(updateSchema, input);
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Record<string, any> | undefined;
  if (!existing) throw new ApiError(404, "Not found");

  db.prepare("UPDATE users SET name=?, role=?, active=? WHERE id=?").run(
    data.name ?? existing.name,
    data.role ?? existing.role,
    data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
    id
  );
  if (data.password) {
    const hash = bcrypt.hashSync(data.password, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, id);
  }
  return { ok: true };
}

export function deleteEmployee(id: number, currentUserId: number) {
  if (id === currentUserId) throw new ApiError(400, "Cannot delete your own account");
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}
