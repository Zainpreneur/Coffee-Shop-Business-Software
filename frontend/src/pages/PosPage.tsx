import { useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Button, Card, Input, Label, PageHeader, Select, Spinner, EmptyState } from "../components/ui";
import type { Category, CartLine, Customer, MenuItem, Order } from "../types";

const TAX_RATE = 0.0825;

export function PosPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mobile">("card");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Order | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [c, m, cu] = await Promise.all([
        api.get<Category[]>("/menu/categories"),
        api.get<MenuItem[]>("/menu/items"),
        api.get<Customer[]>("/customers"),
      ]);
      setCategories(c.data);
      setMenuItems(m.data);
      setCustomers(cu.data);
      setLoading(false);
    }
    load();
  }, []);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (activeCategory !== "all" && item.category_id !== activeCategory) return false;
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [menuItems, activeCategory, search]);

  const subtotal = cart.reduce((sum, line) => sum + line.unit_price * line.quantity, 0);
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const pointsDiscount = redeemPoints * 0.05;
  const totalDiscount = discount + pointsDiscount;
  const taxable = Math.max(subtotal - totalDiscount, 0);
  const tax = Math.round(taxable * TAX_RATE * 100) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((l) => l.menu_item_id === item.id);
      if (existing) {
        return prev.map((l) => (l.menu_item_id === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { menu_item_id: item.id, name: item.name, unit_price: item.price, quantity: 1 }];
    });
  }

  function updateQty(menuItemId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.menu_item_id === menuItemId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(menuItemId: number) {
    setCart((prev) => prev.filter((l) => l.menu_item_id !== menuItemId));
  }

  function resetOrder() {
    setCart([]);
    setCustomerId("");
    setRedeemPoints(0);
    setDiscount(0);
    setReceipt(null);
    setError(null);
  }

  async function checkout() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post<Order>("/orders/checkout", {
        customer_id: customerId || null,
        payment_method: paymentMethod,
        discount,
        redeem_points: redeemPoints,
        items: cart.map((l) => ({ menu_item_id: l.menu_item_id, quantity: l.quantity })),
      });
      setReceipt(data);
      setCart([]);
      // refresh customer list to reflect new points balance
      const cu = await api.get<Customer[]>("/customers");
      setCustomers(cu.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;

  if (receipt) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card className="p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-xl font-bold mb-1">Order Complete</h2>
          <p className="text-sm text-espresso-400 dark:text-espresso-300 mb-4">Order #{receipt.order_number}</p>
          <div className="text-left border-t border-b border-espresso-100 dark:border-espresso-700 py-4 my-4 space-y-1">
            {receipt.items?.map((li) => (
              <div key={li.id} className="flex justify-between text-sm">
                <span>
                  {li.quantity} × {li.name}
                </span>
                <span>${(li.unit_price * li.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-sm text-left">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${receipt.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-${receipt.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>${receipt.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Total</span>
              <span>${receipt.total.toFixed(2)}</span>
            </div>
          </div>
          {receipt.loyalty_points_earned > 0 && (
            <p className="text-xs text-espresso-400 dark:text-espresso-300 mt-3">
              +{receipt.loyalty_points_earned} loyalty points earned
            </p>
          )}
          <Button className="w-full mt-6" onClick={resetOrder}>
            Start New Order
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Point of Sale" subtitle="Build the order, then check out" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu grid */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap gap-2 mb-4">
            <CategoryPill active={activeCategory === "all"} onClick={() => setActiveCategory("all")}>
              All
            </CategoryPill>
            {categories.map((c) => (
              <CategoryPill key={c.id} active={activeCategory === c.id} onClick={() => setActiveCategory(c.id)}>
                {c.name}
              </CategoryPill>
            ))}
            <div className="ml-auto w-48">
              <Input placeholder="Search menu…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <EmptyState message="No menu items found" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="text-left bg-white dark:bg-espresso-800/40 border border-espresso-100 dark:border-espresso-700 rounded-xl p-3 hover:border-espresso-400 hover:shadow-md transition-all active:scale-95"
                >
                  <div className="text-2xl mb-1">{item.image_emoji}</div>
                  <div className="text-sm font-semibold leading-tight">{item.name}</div>
                  <div className="text-xs text-espresso-400 dark:text-espresso-300 mt-1">${item.price.toFixed(2)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart & checkout */}
        <div>
          <Card className="p-4 sticky top-6">
            <h3 className="font-semibold text-sm mb-3">Current Order</h3>
            {cart.length === 0 ? (
              <EmptyState message="Tap a menu item to add it" />
            ) : (
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {cart.map((line) => (
                  <div key={line.menu_item_id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{line.name}</p>
                      <p className="text-xs text-espresso-400 dark:text-espresso-300">${line.unit_price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(line.menu_item_id, -1)}
                        className="w-6 h-6 rounded bg-espresso-100 dark:bg-espresso-700 text-espresso-700 dark:text-cream-100"
                      >
                        −
                      </button>
                      <span className="w-5 text-center">{line.quantity}</span>
                      <button
                        onClick={() => updateQty(line.menu_item_id, 1)}
                        className="w-6 h-6 rounded bg-espresso-100 dark:bg-espresso-700 text-espresso-700 dark:text-cream-100"
                      >
                        +
                      </button>
                      <button onClick={() => removeLine(line.menu_item_id)} className="text-red-400 hover:text-red-600 ml-1">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 border-t border-espresso-100 dark:border-espresso-700 pt-3">
              <div>
                <Label>Customer (optional)</Label>
                <Select
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value ? Number(e.target.value) : "");
                    setRedeemPoints(0);
                  }}
                >
                  <option value="">Walk-in / guest</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.loyalty_points} pts)
                    </option>
                  ))}
                </Select>
              </div>

              {selectedCustomer && selectedCustomer.loyalty_points > 0 && (
                <div>
                  <Label>Redeem points (1pt = $0.05)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={selectedCustomer.loyalty_points}
                    value={redeemPoints}
                    onChange={(e) =>
                      setRedeemPoints(Math.min(Number(e.target.value) || 0, selectedCustomer.loyalty_points))
                    }
                  />
                </div>
              )}

              <div>
                <Label>Discount ($)</Label>
                <Input type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
              </div>

              <div>
                <Label>Payment method</Label>
                <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                  <option value="mobile">Mobile</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1 text-sm border-t border-espresso-100 dark:border-espresso-700 mt-3 pt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-${totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (8.25%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

            <Button className="w-full mt-4" disabled={cart.length === 0 || submitting} onClick={checkout}>
              {submitting ? "Processing…" : `Charge $${total.toFixed(2)}`}
            </Button>
            {cart.length > 0 && (
              <Button variant="ghost" className="w-full mt-1" onClick={resetOrder}>
                Clear order
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function CategoryPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active ? "bg-espresso-600 text-white" : "bg-espresso-100 dark:bg-espresso-700 text-espresso-700 dark:text-cream-100 hover:bg-espresso-200"
      }`}
    >
      {children}
    </button>
  );
}
