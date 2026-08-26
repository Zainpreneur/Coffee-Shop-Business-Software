import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Spinner } from "../components/ui";
import type { InventoryItem } from "../types";

const emptyForm = {
  id: 0,
  name: "",
  unit: "unit",
  quantity_on_hand: 0,
  reorder_level: 0,
  cost_per_unit: 0,
};

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("Restock");

  async function load() {
    setLoading(true);
    const { data } = await api.get<InventoryItem[]>("/inventory");
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setForm({
      id: item.id,
      name: item.name,
      unit: item.unit,
      quantity_on_hand: item.quantity_on_hand,
      reorder_level: item.reorder_level,
      cost_per_unit: item.cost_per_unit,
    });
    setError(null);
    setModalOpen(true);
  }

  async function save() {
    setError(null);
    try {
      const payload = {
        name: form.name,
        unit: form.unit,
        quantity_on_hand: Number(form.quantity_on_hand),
        reorder_level: Number(form.reorder_level),
        cost_per_unit: Number(form.cost_per_unit),
      };
      if (form.id) {
        await api.put(`/inventory/${form.id}`, payload);
      } else {
        await api.post("/inventory", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function remove(item: InventoryItem) {
    if (!confirm(`Delete "${item.name}" from inventory? Linked recipes will lose this ingredient.`)) return;
    await api.delete(`/inventory/${item.id}`);
    await load();
  }

  async function submitAdjustment() {
    if (!adjustTarget || adjustQty === 0) return;
    try {
      await api.post(`/inventory/${adjustTarget.id}/adjust`, { change_qty: adjustQty, reason: adjustReason });
      setAdjustTarget(null);
      setAdjustQty(0);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Inventory" subtitle="Stock levels, reorder thresholds, and adjustments" actions={<Button onClick={openCreate}>+ New item</Button>} />

      <Card>
        {items.length === 0 ? (
          <EmptyState message="No inventory items yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-espresso-400 dark:text-espresso-300 border-b border-espresso-100 dark:border-espresso-700">
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">On hand</th>
                  <th className="py-3 px-4">Reorder level</th>
                  <th className="py-3 px-4">Cost / unit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const low = item.quantity_on_hand <= item.reorder_level;
                  return (
                    <tr key={item.id} className="border-b border-espresso-50 dark:border-espresso-800">
                      <td className="py-2.5 px-4 font-medium">{item.name}</td>
                      <td className="py-2.5 px-4">
                        {item.quantity_on_hand} {item.unit}
                      </td>
                      <td className="py-2.5 px-4 text-espresso-500 dark:text-espresso-300">
                        {item.reorder_level} {item.unit}
                      </td>
                      <td className="py-2.5 px-4">${item.cost_per_unit.toFixed(3)}</td>
                      <td className="py-2.5 px-4">
                        <Badge tone={low ? "warning" : "success"}>{low ? "Low stock" : "OK"}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-2">
                        <Button variant="ghost" onClick={() => setAdjustTarget(item)}>
                          Adjust
                        </Button>
                        <Button variant="ghost" onClick={() => openEdit(item)}>
                          Edit
                        </Button>
                        <Button variant="ghost" onClick={() => remove(item)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit inventory item" : "New inventory item"}>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="g, ml, unit..." />
            </div>
            <div>
              <Label>Cost per unit ($)</Label>
              <Input
                type="number"
                min={0}
                step="0.001"
                value={form.cost_per_unit}
                onChange={(e) => setForm((f) => ({ ...f, cost_per_unit: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity on hand</Label>
              <Input
                type="number"
                min={0}
                value={form.quantity_on_hand}
                onChange={(e) => setForm((f) => ({ ...f, quantity_on_hand: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Reorder level</Label>
              <Input
                type="number"
                min={0}
                value={form.reorder_level}
                onChange={(e) => setForm((f) => ({ ...f, reorder_level: Number(e.target.value) }))}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" onClick={save} disabled={!form.name}>
            {form.id ? "Save changes" : "Create item"}
          </Button>
        </div>
      </Modal>

      <Modal open={!!adjustTarget} onClose={() => setAdjustTarget(null)} title={`Adjust stock — ${adjustTarget?.name ?? ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-espresso-500 dark:text-espresso-300">
            Current: {adjustTarget?.quantity_on_hand} {adjustTarget?.unit}
          </p>
          <div>
            <Label>Change (use negative to remove, e.g. waste)</Label>
            <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} />
          </div>
          <div>
            <Label>Reason</Label>
            <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Restock, waste, correction..." />
          </div>
          <Button className="w-full" onClick={submitAdjustment} disabled={adjustQty === 0}>
            Apply adjustment
          </Button>
        </div>
      </Modal>
    </div>
  );
}
