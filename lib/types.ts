export type Role = "admin" | "manager" | "cashier";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Category {
  id: number;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: number;
  category_id: number | null;
  category_name?: string | null;
  name: string;
  description: string;
  price: number;
  is_active: number;
  image_emoji: string;
}

export interface RecipeItem {
  id: number;
  menu_item_id: number;
  inventory_item_id: number;
  quantity_used: number;
  inventory_name?: string;
  unit?: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  quantity_on_hand: number;
  reorder_level: number;
  cost_per_unit: number;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  inventory_item_id: number;
  change_qty: number;
  reason: string;
  created_at: string;
  created_by: number | null;
  user_name?: string | null;
}

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  loyalty_points: number;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number | null;
  name: string;
  unit_price: number;
  quantity: number;
  notes: string | null;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number | null;
  customer_name?: string | null;
  user_id: number | null;
  cashier_name?: string | null;
  status: "open" | "completed" | "cancelled";
  payment_method: "cash" | "card" | "mobile" | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  loyalty_points_earned: number;
  loyalty_points_redeemed: number;
  created_at: string;
  completed_at: string | null;
  items?: OrderItem[];
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: number;
  created_at: string;
}

export interface CartLine {
  menu_item_id: number;
  name: string;
  unit_price: number;
  quantity: number;
  notes?: string;
}

export interface Summary {
  today: { revenue: number; orders: number };
  last7Days: { revenue: number; orders: number };
  allTime: { revenue: number; orders: number };
  lowStockCount: number;
  customerCount: number;
}

export interface RevenueDay {
  day: string;
  revenue: number;
  orders: number;
}

export interface TopItem {
  name: string;
  quantity_sold: number;
  revenue: number;
}

export interface PaymentMethodReport {
  payment_method: string | null;
  orders: number;
  revenue: number;
}
