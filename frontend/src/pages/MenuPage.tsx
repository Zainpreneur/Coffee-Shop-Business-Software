import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select, Spinner } from "../components/ui";
import type { Category, InventoryItem, MenuItem, RecipeItem } from "../types";

interface RecipeDraft {
  inventory_item_id: number;
  quantity_used: number;
}

const emptyForm = {
  id: 0,
  category_id: "" as number | "",
  name: "",
  description: "",
  price: "" as number | "",
  image_emoji: "☕",
  is_active: true,
};

export function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [recipe, setRecipe] = useState<RecipeDraft[]>([]);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  async function loadAll() {
    setLoading(true);
    const [c, m, i] = await Promise.all([
      api.get<Category[]>("/menu/categories"),
      api.get<MenuItem[]>("/menu/items?all=1"),
      api.get<InventoryItem[]>("/inventory"),
    ]);
    setCategories(c.data);
    setItems(m.data);
    setInventory(i.data);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setRecipe([]);
    setError(null);
    setModalOpen(true);
  }

  async function openEdit(item: MenuItem) {
    setError(null);
    const { data } = await api.get<MenuItem & { recipe: RecipeItem[] }>(`/menu/items/${item.id}`);
    setForm({
      id: data.id,
      category_id: data.category_id ?? "",
      name: data.name,
      description: data.description ?? "",
      price: data.price,
      image_emoji: data.image_emoji,
      is_active: !!data.is_active,
    });
    setRecipe(data.recipe.map((r) => ({ inventory_item_id: r.inventory_item_id, quantity_used: r.quantity_used })));
    setModalOpen(true);
  }

  function addRecipeLine() {
    if (inventory.length === 0) return;
    setRecipe((prev) => [...prev, { inventory_item_id: inventory[0].id, quantity_used: 1 }]);
  }

  function updateRecipeLine(idx: number, patch: Partial<RecipeDraft>) {
    setRecipe((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRecipeLine(idx: number) {
    setRecipe((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    setError(null);
    try {
      const payload = {
        category_id: form.category_id === "" ? null : Number(form.category_id),
        name: form.name,
        description: form.description,
        price: Number(form.price),
        image_emoji: form.image_emoji || "☕",
        is_active: form.is_active,
        recipe,
      };
      if (form.id) {
        await api.put(`/menu/items/${form.id}`, payload);
      } else {
        await api.post("/menu/items", payload);
      }
      setModalOpen(false);
      await loadAll();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function removeItem(item: MenuItem) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await api.delete(`/menu/items/${item.id}`);
    await loadAll();
  }

  async function saveCategory() {
    if (!newCategory.trim()) return;
    try {
      await api.post("/menu/categories", { name: newCategory.trim(), sort_order: categories.length });
      setNewCategory("");
      await loadAll();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  async function removeCategory(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"? Items in it will become uncategorized.`)) return;
    await api.delete(`/menu/categories/${cat.id}`);
    await loadAll();
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Menu"
        subtitle="Manage categories, items, pricing, and recipes"
        actions={
          <>
            <Button variant="secondary" onClick={() => setCategoryModalOpen(true)}>
              Manage categories
            </Button>
            <Button onClick={openCreate}>+ New item</Button>
          </>
        }
      />

      <Card>
        {items.length === 0 ? (
          <EmptyState message="No menu items yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-espresso-400 dark:text-espresso-300 border-b border-espresso-100 dark:border-espresso-700">
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-espresso-50 dark:border-espresso-800">
                    <td className="py-2.5 px-4">
                      <span className="mr-2">{item.image_emoji}</span>
                      <span className="font-medium">{item.name}</span>
                    </td>
                    <td className="py-2.5 px-4 text-espresso-500 dark:text-espresso-300">{item.category_name ?? "—"}</td>
                    <td className="py-2.5 px-4">${item.price.toFixed(2)}</td>
                    <td className="py-2.5 px-4">
                      <Badge tone={item.is_active ? "success" : "neutral"}>{item.is_active ? "Active" : "Hidden"}</Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-2">
                      <Button variant="ghost" onClick={() => openEdit(item)}>
                        Edit
                      </Button>
                      <Button variant="ghost" onClick={() => removeItem(item)}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit menu item" : "New menu item"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Emoji</Label>
              <Input value={form.image_emoji} onChange={(e) => setForm((f) => ({ ...f, image_emoji: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value === "" ? "" : Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value === "" ? "" : Number(e.target.value) }))}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            Visible on POS menu
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Recipe (inventory used per item)</Label>
              <Button variant="ghost" onClick={addRecipeLine} type="button">
                + Add ingredient
              </Button>
            </div>
            <div className="space-y-2">
              {recipe.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select
                    value={r.inventory_item_id}
                    onChange={(e) => updateRecipeLine(idx, { inventory_item_id: Number(e.target.value) })}
                    className="flex-1"
                  >
                    {inventory.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.unit})
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={r.quantity_used}
                    onChange={(e) => updateRecipeLine(idx, { quantity_used: Number(e.target.value) })}
                    className="w-24"
                  />
                  <button onClick={() => removeRecipeLine(idx)} className="text-red-400 hover:text-red-600">
                    ✕
                  </button>
                </div>
              ))}
              {recipe.length === 0 && <p className="text-xs text-espresso-400">No ingredients linked yet.</p>}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button className="w-full" onClick={save} disabled={!form.name || form.price === ""}>
            {form.id ? "Save changes" : "Create item"}
          </Button>
        </div>
      </Modal>

      <Modal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="Manage categories">
        <div className="space-y-3">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm border-b border-espresso-50 dark:border-espresso-700 pb-2">
              <span>{c.name}</span>
              <Button variant="ghost" onClick={() => removeCategory(c)}>
                Delete
              </Button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <Button onClick={saveCategory}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
