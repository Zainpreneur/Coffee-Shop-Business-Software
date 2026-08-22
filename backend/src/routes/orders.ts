import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

const TAX_RATE = 0.0825; // 8.25% sample sales tax
const POINTS_PER_DOLLAR = 1; // loyalty points earned per $1 spent
const POINT_VALUE = 0.05; // $0.05 discount per point redeemed

function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${datePart}-${rand}`;
}

router.get("/", requireAuth, (req, res) => {
  const { status, from, to, limit } = req.query as Record<string, string | undefined>;
  const clauses: string[] = [];
  const params: any[] = [];
  if (status) {
    clauses.push("o.status = ?");
    params.push(status);
  }
  if (from) {
    clauses.push("o.created_at >= ?");
    params.push(from);
  }
  if (to) {
    clauses.push("o.created_at <= ?");
    params.push(to);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const lim = Math.min(Number(limit) || 100, 500);
  const rows = db
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
  res.json(rows);
});

router.get("/:id", requireAuth, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(req.params.id);
  res.json({ ...order, items });
});

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

router.post("/checkout", requireAuth, (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { customer_id, payment_method, discount, redeem_points } = parsed.data;
  const cartItems = parsed.data.items;

  try {
    const result = db.transaction(() => {
      // Load menu items & validate
      const menuItemStmt = db.prepare("SELECT * FROM menu_items WHERE id = ? AND is_active = 1");
      const recipeStmt = db.prepare("SELECT * FROM recipe_items WHERE menu_item_id = ?");
      const invStmt = db.prepare("SELECT * FROM inventory_items WHERE id = ?");

      let subtotal = 0;
      const lineItems: { menu_item_id: number; name: string; unit_price: number; quantity: number; notes?: string }[] = [];
      const inventoryDeductions = new Map<number, number>();

      for (const item of cartItems) {
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

      // Validate stock availability
      for (const [invId, needed] of inventoryDeductions) {
        const invItem = invStmt.get(invId) as any;
        if (!invItem) continue;
        if (invItem.quantity_on_hand < needed) {
          throw new Error(`Insufficient stock for ${invItem.name}: need ${needed}${invItem.unit}, have ${invItem.quantity_on_hand}${invItem.unit}`);
        }
      }

      // Handle loyalty point redemption
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
          req.user!.id,
          payment_method,
          subtotal,
          tax,
          totalDiscount,
          total,
          pointsEarned,
          redeem_points
        );
      const orderId = orderInfo.lastInsertRowid as number;

      const insertItem = db.prepare(
        `INSERT INTO order_items (order_id, menu_item_id, name, unit_price, quantity, notes) VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const li of lineItems) {
        insertItem.run(orderId, li.menu_item_id, li.name, li.unit_price, li.quantity, li.notes ?? null);
      }

      // Deduct inventory
      const updateInv = db.prepare(
        `UPDATE inventory_items SET quantity_on_hand = quantity_on_hand - ?, updated_at = datetime('now') WHERE id = ?`
      );
      const insertMovement = db.prepare(
        `INSERT INTO stock_movements (inventory_item_id, change_qty, reason, created_by) VALUES (?, ?, ?, ?)`
      );
      for (const [invId, qty] of inventoryDeductions) {
        updateInv.run(qty, invId);
        insertMovement.run(invId, -qty, `Order ${orderNumber}`, req.user!.id);
      }

      // Update customer loyalty points
      if (customer_id) {
        db.prepare(
          `UPDATE customers SET loyalty_points = loyalty_points - ? + ? WHERE id = ?`
        ).run(redeem_points, pointsEarned, customer_id);
      }

      return { orderId, orderNumber, subtotal, tax, discount: totalDiscount, total, pointsEarned };
    })();

    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(result.orderId);
    res.status(201).json({ ...result, items });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Checkout failed" });
  }
});

router.post("/:id/cancel", requireAuth, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id) as any;
  if (!order) return res.status(404).json({ error: "Not found" });
  if (order.status === "cancelled") return res.json({ ok: true });

  const run = db.transaction(() => {
    // restock inventory if it was completed
    if (order.status === "completed") {
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(req.params.id) as any[];
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
          insertMovement.run(r.inventory_item_id, qty, `Cancelled order ${order.order_number}`, req.user!.id);
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
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  });
  run();
  res.json({ ok: true });
});

export default router;
