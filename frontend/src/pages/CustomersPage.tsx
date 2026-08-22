import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Spinner } from "../components/ui";
import type { Customer, Order } from "../types";

const emptyForm = { id: 0, name: "", email: "", phone: "" };

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [detail, setDetail] = useState<(Customer & { orders: Order[] }) | null>(null);

  async function load(q = "") {
    setLoading(true);
    const { data } = await api.get<Customer[]>("/customers", { params: q ? { q } : {} });
    setCustomers(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(c: Customer) {
    setForm({ id: c.id, name: c.name, email: c.email ?? "", phone: c.phone ?? "" });
    setError(null);
    setModalOpen(true);
  }

  async function openDetail(c: Customer) {
    const { data } = await api.get<Customer & { orders: Order[] }>(`/customers/${c.id}`);
    setDetail(data);
  }

  async function save() {
    setError(null);
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone };
      if (form.id) {
        await api.put(`/customers/${form.id}`, payload);
      } else {
        await api.post("/customers", payload);
      }
      setModalOpen(false);
      await load(search);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function remove(c: Customer) {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    await api.delete(`/customers/${c.id}`);
    await load(search);
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Customers"
        subtitle="Manage customer profiles and loyalty points"
        actions={
          <>
            <Input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
            <Button onClick={openCreate}>+ New customer</Button>
          </>
        }
      />

      <Card>
        {customers.length === 0 ? (
          <EmptyState message="No customers found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-espresso-400 dark:text-espresso-300 border-b border-espresso-100 dark:border-espresso-700">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Loyalty points</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-espresso-50 dark:border-espresso-800">
                    <td className="py-2.5 px-4 font-medium cursor-pointer" onClick={() => openDetail(c)}>
                      {c.name}
                    </td>
                    <td className="py-2.5 px-4 text-espresso-500 dark:text-espresso-300">{c.email || "—"}</td>
                    <td className="py-2.5 px-4 text-espresso-500 dark:text-espresso-300">{c.phone || "—"}</td>
                    <td className="py-2.5 px-4">
                      <Badge>{c.loyalty_points} pts</Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-2">
                      <Button variant="ghost" onClick={() => openEdit(c)}>
                        Edit
                      </Button>
                      <Button variant="ghost" onClick={() => remove(c)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit customer" : "New customer"}>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" onClick={save} disabled={!form.name}>
            {form.id ? "Save changes" : "Create customer"}
          </Button>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ""}>
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span>{detail.email || "No email"}</span>
              <span>{detail.phone || "No phone"}</span>
              <Badge>{detail.loyalty_points} pts</Badge>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-espresso-400 mb-2">Recent orders</h4>
              {detail.orders.length === 0 ? (
                <EmptyState message="No orders yet" />
              ) : (
                <div className="space-y-2">
                  {detail.orders.map((o) => (
                    <div key={o.id} className="flex justify-between text-sm border-b border-espresso-50 dark:border-espresso-700 pb-1">
                      <span>
                        {o.order_number} · {new Date(o.created_at).toLocaleDateString()}
                      </span>
                      <span className="font-medium">${o.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
