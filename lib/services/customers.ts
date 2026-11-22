import { z } from "zod";
import { ApiError, parse } from "@/lib/api";
import { db } from "@/lib/db";

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")).optional(),
  phone: z.string().optional(),
});

export function listCustomers(q?: string) {
  const term = q?.trim();
  if (term) {
    return db
      .prepare(`SELECT * FROM customers WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY name`)
      .all(`%${term}%`, `%${term}%`, `%${term}%`);
  }
  return db.prepare("SELECT * FROM customers ORDER BY name").all();
}

export function getCustomer(id: number) {
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(id);
  if (!customer) throw new ApiError(404, "Not found");
  const orders = db.prepare("SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20").all(id);
  return { ...customer, orders };
}

export function createCustomer(input: unknown) {
  const { name, email, phone } = parse(customerSchema, input);
  const info = db
    .prepare("INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)")
    .run(name, email || null, phone || null);
  return { id: Number(info.lastInsertRowid) };
}

export function updateCustomer(id: number, input: unknown) {
  const data = parse(customerSchema.partial(), input);
  const existing = db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as Record<string, any> | undefined;
  if (!existing) throw new ApiError(404, "Not found");

  const values = { ...existing, ...data };
  db.prepare("UPDATE customers SET name=?, email=?, phone=? WHERE id=?").run(
    values.name,
    values.email || null,
    values.phone || null,
    id
  );
  return { ok: true };
}

export function deleteCustomer(id: number) {
  db.prepare("DELETE FROM customers WHERE id = ?").run(id);
}
