import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Select, Spinner } from "../components/ui";
import type { Order } from "../types";
import { useAuth } from "../context/AuthContext";

function statusTone(status: Order["status"]) {
  if (status === "completed") return "success" as const;
  if (status === "cancelled") return "danger" as const;
  return "neutral" as const;
}

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await api.get<Order[]>("/orders", { params: statusFilter ? { status: statusFilter } : {} });
    setOrders(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function openDetail(order: Order) {
    const { data } = await api.get<Order>(`/orders/${order.id}`);
    setSelected(data);
  }

  async function cancelOrder(order: Order) {
    if (!confirm(`Cancel order #${order.order_number}? Inventory and loyalty points will be restored.`)) return;
    setError(null);
    try {
      await api.post(`/orders/${order.id}/cancel`);
      setSelected(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const canCancel = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Orders"
        subtitle="Order history and receipts"
        actions={
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        }
      />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <Card>
        {loading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <EmptyState message="No orders found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-espresso-400 dark:text-espresso-300 border-b border-espresso-100 dark:border-espresso-700">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => openDetail(o)}
                    className="border-b border-espresso-50 dark:border-espresso-800 hover:bg-espresso-50 dark:hover:bg-espresso-800/60 cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-medium">{o.order_number}</td>
                    <td className="py-2.5 px-4 text-espresso-500 dark:text-espresso-300">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">{o.customer_name ?? "Walk-in"}</td>
                    <td className="py-2.5 px-4">{o.cashier_name ?? "—"}</td>
                    <td className="py-2.5 px-4 capitalize">{o.payment_method}</td>
                    <td className="py-2.5 px-4">
                      <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold">${o.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.order_number ?? ""}`}>
        {selected && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-espresso-500 dark:text-espresso-300">
              <span>{new Date(selected.created_at).toLocaleString()}</span>
              <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
            </div>
            <div className="border-t border-b border-espresso-100 dark:border-espresso-700 py-3 space-y-1">
              {selected.items?.map((li) => (
                <div key={li.id} className="flex justify-between text-sm">
                  <span>
                    {li.quantity} × {li.name}
                  </span>
                  <span>${(li.unit_price * li.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${selected.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-${selected.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${selected.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>${selected.total.toFixed(2)}</span>
              </div>
            </div>
            {canCancel && selected.status === "completed" && (
              <Button variant="danger" className="w-full" onClick={() => cancelOrder(selected)}>
                Cancel order & restock
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
