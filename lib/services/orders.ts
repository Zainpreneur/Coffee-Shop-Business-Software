import { z } from "zod";
import { ApiError, parse } from "@/lib/api";
import { db } from "@/lib/db";

const TAX_RATE = 0.0825; // 8.25% sample sales tax
const POINTS_PER_DOLLAR = 1;
const POINT_VALUE = 0.05;

const checkoutSchema = z.object({
  customer_id: z.number().int().nullable().optional(),
  payment_method: z.enum(["cash", "card", "mobile"]),
  discount: z.number().nonnegative().optional().default(0),
  redeem_points: z.number().int().nonnegative().optional().default(0),
  items: z
    .array(
      z.object({
        menu_item_id: z.number().int(),
        quantity: z.number().int().positive(),
        notes: z.string().optional(),
      })
    )
    .min(1),
});

function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${datePart}-${rand}`;
}

export function listOrders(filters: { status?: string; from?: string; to?: string; limit?: string }) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    clauses.push("o.status = ?");
    params.push(filters.status);
  }
  if (filters.from) {
    clauses.push("o.created_at >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push("o.created_at <= ?");
    params.push(filters.to);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const lim = Math.min(Number(filters.limit) || 100, 500);

  return db
    .prepare(
      `SELECT o.*, c.name as customer_name, u.name as cashier_name
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       LEFT JOIN users u ON u.id = o.user_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT ?`
    )
    .all(...params, lim);
}

export function getOrder(id: number) {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  if (!order) throw new ApiError(404, "Not found");
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(id);
  return { ...order, items };
}

export function checkout(input: unknown, userId: number) {
  const { customer_id, payment_method, discount = 0, redeem_points = 0, items } = parse(checkoutSchema, input);

  let result: { orderId: number; orderNumber: string; subtotal: number; tax: number; discount: number; total: number; pointsEarned: number };

  try {
    result = db.transaction(() => {
      const menuItemStmt = db.prepare("SELECT * FROM menu_items WHERE id = ? AND is_active = 1");
      const recipeStmt = db.prepare("SELECT * FROM recipe_items WHERE menu_item_id = ?");
      const invStmt = db.prepare("SELECT * FROM inventory_items WHERE id = ?");

      let subtotal = 0;
      const lineItems: { menu_item_id: number; name: string; unit_price: number; quantity: number; notes?: string }[] = [];
      const inventoryDeductions = new Map<number, number>();

      for (const item of items) {
        const menuItem = menuItemStmt.get(item.menu_item_id) as any;
        if (!menuItem) throw new Error(`Menu item ${item.menu_item_id} not found or inactive`);
        subtotal += menuItem.price * item.quantity;
        lineItems.push({
          menu_item_id: menuItem.id,
          name: menuItem.name,
          unit_price: menuItem.price,
          quantity: item.quantity,
          notes: item.notes,
        });

        const recipe = recipeStmt.all(menuItem.id) as any[];
        for (const r of recipe) {
          const needed = r.quantity_used * item.quantity;
          inventoryDeductions.set(r.inventory_item_id, (inventoryDeductions.get(r.inventory_item_id) || 0) + needed);
        }
      }

      for (const [invId, needed] of inventoryDeductions) {
        const invItem = invStmt.get(invId) as any;
        if (!invItem) continue;
        if (invItem.quantity_on_hand < needed) {
          throw new Error(
            `Insufficient stock for ${invItem.name}: need ${needed}${invItem.unit}, have ${invItem.quantity_on_hand}${invItem.unit}`
          );
        }
      }

      let pointsDiscount = 0;
      if (redeem_points > 0) {
        if (!customer_id) throw new Error("Cannot redeem points without a customer");
        const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(customer_id) as any;
        if (!customer) throw new Error("Customer not found");
        if (customer.loyalty_points < redeem_points) throw new Error("Customer does not have enough loyalty points");
        pointsDiscount = redeem_points * POINT_VALUE;
      }

      const totalDiscount = discount + pointsDiscount;
      const taxable = Math.max(subtotal - totalDiscount, 0);
      const tax = Math.round(taxable * TAX_RATE * 100) / 100;
      const total = Math.round((taxable + tax) * 100) / 100;
      const pointsEarned = Math.floor(total * POINTS_PER_DOLLAR);

      const orderNumber = generateOrderNumber();
      const orderInfo = db
        .prepare(
          `INSERT INTO orders (order_number, customer_id, user_id, status, payment_method, subtotal, tax, discount, total, loyalty_points_earned, loyalty_points_redeemed, completed_at)
           VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .run(
          orderNumber,
          customer_id ?? null,
          userId,
          payment_method,
          subtotal,
          tax,
          totalDiscount,
          total,
          pointsEarned,
          redeem_points
        );
      const orderId = Number(orderInfo.lastInsertRowid);

      const insertItem = db.prepare(
        `INSERT INTO order_items (order_id, menu_item_id, name, unit_price, quantity, notes) VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const li of lineItems) {
        insertItem.run(orderId, li.menu_item_id, li.name, li.unit_price, li.quantity, li.notes ?? null);
      }

      const updateInv = db.prepare(
        `UPDATE inventory_items SET quantity_on_hand = quantity_on_hand - ?, updated_at = datetime('now') WHERE id = ?`
      );
      const insertMovement = db.prepare(
        `INSERT INTO stock_movements (inventory_item_id, change_qty, reason, created_by) VALUES (?, ?, ?, ?)`
      );
      for (const [invId, qty] of inventoryDeductions) {
        updateInv.run(qty, invId);
        insertMovement.run(invId, -qty, `Order ${orderNumber}`, userId);
      }

      if (customer_id) {
        db.prepare(`UPDATE customers SET loyalty_points = loyalty_points - ? + ? WHERE id = ?`).run(
          redeem_points,
          pointsEarned,
          customer_id
        );
      }

      return { orderId, orderNumber, subtotal, tax, discount: totalDiscount, total, pointsEarned };
    })();
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : "Checkout failed");
  }

  const orderItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(result.orderId);
  return { ...result, items: orderItems };
}

export function cancelOrder(id: number, userId: number) {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
  if (!order) throw new ApiError(404, "Not found");
  if (order.status === "cancelled") return { ok: true };

  db.transaction(() => {
    if (order.status === "completed") {
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(id) as any[];
      const recipeStmt = db.prepare("SELECT * FROM recipe_items WHERE menu_item_id = ?");
      const updateInv = db.prepare(
        `UPDATE inventory_items SET quantity_on_hand = quantity_on_hand + ?, updated_at = datetime('now') WHERE id = ?`
      );
      const insertMovement = db.prepare(
        `INSERT INTO stock_movements (inventory_item_id, change_qty, reason, created_by) VALUES (?, ?, ?, ?)`
      );
      for (const item of items) {
        if (!item.menu_item_id) continue;
        const recipe = recipeStmt.all(item.menu_item_id) as any[];
        for (const r of recipe) {
          const qty = r.quantity_used * item.quantity;
          updateInv.run(qty, r.inventory_item_id);
          insertMovement.run(r.inventory_item_id, qty, `Cancelled order ${order.order_number}`, userId);
        }
      }
      if (order.customer_id) {
        db.prepare(`UPDATE customers SET loyalty_points = loyalty_points - ? + ? WHERE id = ?`).run(
          order.loyalty_points_earned,
          order.loyalty_points_redeemed,
          order.customer_id
        );
      }
    }
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id);
  })();

  return { ok: true };
}
