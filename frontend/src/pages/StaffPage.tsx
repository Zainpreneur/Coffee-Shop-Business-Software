import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select, Spinner } from "../components/ui";
import type { Employee, Role } from "../types";
import { useAuth } from "../context/AuthContext";

const emptyForm = { id: 0, name: "", email: "", password: "", role: "cashier" as Role, active: true };

export function StaffPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    const { data } = await api.get<Employee[]>("/employees");
    setEmployees(data);
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

  function openEdit(e: Employee) {
    setForm({ id: e.id, name: e.name, email: e.email, password: "", role: e.role, active: !!e.active });
    setError(null);
    setModalOpen(true);
  }

  async function save() {
    setError(null);
    try {
      if (form.id) {
        const payload: any = { name: form.name, role: form.role, active: form.active };
        if (form.password) payload.password = form.password;
        await api.put(`/employees/${form.id}`, payload);
      } else {
        await api.post("/employees", { name: form.name, email: form.email, password: form.password, role: form.role });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function remove(e: Employee) {
    if (!confirm(`Remove staff account "${e.name}"?`)) return;
    try {
      await api.delete(`/employees/${e.id}`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Staff" subtitle="Manage employee accounts and roles" actions={<Button onClick={openCreate}>+ New employee</Button>} />

      <Card>
        {employees.length === 0 ? (
          <EmptyState message="No employees yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-espresso-400 dark:text-espresso-300 border-b border-espresso-100 dark:border-espresso-700">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b border-espresso-50 dark:border-espresso-800">
                    <td className="py-2.5 px-4 font-medium">{e.name}</td>
                    <td className="py-2.5 px-4 text-espresso-500 dark:text-espresso-300">{e.email}</td>
                    <td className="py-2.5 px-4 capitalize">{e.role}</td>
                    <td className="py-2.5 px-4">
                      <Badge tone={e.active ? "success" : "neutral"}>{e.active ? "Active" : "Disabled"}</Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-2">
                      <Button variant="ghost" onClick={() => openEdit(e)}>
                        Edit
                      </Button>
                      {e.id !== user?.id && (
                        <Button variant="ghost" onClick={() => remove(e)}>
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit employee" : "New employee"}>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              disabled={!!form.id}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <Label>{form.id ? "New password (leave blank to keep current)" : "Password"}</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          {form.id !== 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Account active
            </label>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" onClick={save} disabled={!form.name || (!form.id && (!form.email || !form.password))}>
            {form.id ? "Save changes" : "Create employee"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
