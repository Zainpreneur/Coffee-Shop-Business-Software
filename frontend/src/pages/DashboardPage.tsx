import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import { api } from "../api/client";
import { Card, PageHeader, Spinner, Badge, EmptyState } from "../components/ui";
import type { InventoryItem } from "../types";

interface Summary {
  today: { revenue: number; orders: number };
  last7Days: { revenue: number; orders: number };
  allTime: { revenue: number; orders: number };
  lowStockCount: number;
  customerCount: number;
}

interface RevenueDay {
  day: string;
  revenue: number;
  orders: number;
}

interface TopItem {
  name: string;
  quantity_sold: number;
  revenue: number;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [revenue, setRevenue] = useState<RevenueDay[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [s, r, t, l] = await Promise.all([
        api.get<Summary>("/reports/summary"),
        api.get<RevenueDay[]>("/reports/revenue-by-day?days=14"),
        api.get<TopItem[]>("/reports/top-items?limit=6"),
        api.get<InventoryItem[]>("/reports/low-stock"),
      ]);
      setSummary(s.data);
      setRevenue(r.data);
      setTopItems(t.data);
      setLowStock(l.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !summary) return <Spinner />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Dashboard" subtitle="A snapshot of how the shop is doing" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile label="Today's Revenue" value={money(summary.today.revenue)} sub={`${summary.today.orders} orders`} />
        <StatTile label="Last 7 Days" value={money(summary.last7Days.revenue)} sub={`${summary.last7Days.orders} orders`} />
        <StatTile label="All-Time Revenue" value={money(summary.allTime.revenue)} sub={`${summary.allTime.orders} orders`} />
        <StatTile
          label="Low Stock Items"
          value={String(summary.lowStockCount)}
          sub={`${summary.customerCount} customers on file`}
          tone={summary.lowStockCount > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-semibold text-sm text-espresso-700 dark:text-cream-100 mb-4">Revenue — last 14 days</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9c6743" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#9c6743" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0cbb2" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} width={50} />
              <Tooltip formatter={(v) => money(Number(v))} labelFormatter={(l) => `Date: ${l}`} />
              <Area type="monotone" dataKey="revenue" stroke="#825236" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-sm text-espresso-700 dark:text-cream-100 mb-4">Top sellers</h3>
          {topItems.length === 0 ? (
            <EmptyState message="No sales yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topItems} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} hide />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v} sold`} />
                <Bar dataKey="quantity_sold" fill="#b4835c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-espresso-700 dark:text-cream-100">Low stock alerts</h3>
          <Badge tone={lowStock.length > 0 ? "warning" : "success"}>{lowStock.length} item{lowStock.length === 1 ? "" : "s"}</Badge>
        </div>
        {lowStock.length === 0 ? (
          <EmptyState message="Everything is well stocked 🎉" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-espresso-400 dark:text-espresso-300 border-b border-espresso-100 dark:border-espresso-700">
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">On hand</th>
                  <th className="py-2 pr-4">Reorder level</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item) => (
                  <tr key={item.id} className="border-b border-espresso-50 dark:border-espresso-800">
                    <td className="py-2 pr-4 font-medium">{item.name}</td>
                    <td className="py-2 pr-4">
                      {item.quantity_on_hand} {item.unit}
                    </td>
                    <td className="py-2 pr-4 text-espresso-400 dark:text-espresso-300">
                      {item.reorder_level} {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warning" | "success" }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-espresso-400 dark:text-espresso-300">{label}</p>
      <p className="text-2xl font-bold mt-1 text-espresso-800 dark:text-cream-100">{value}</p>
      {sub && (
        <p className={`text-xs mt-1 ${tone === "warning" ? "text-amber-600" : tone === "success" ? "text-green-600" : "text-espresso-400 dark:text-espresso-300"}`}>
          {sub}
        </p>
      )}
    </Card>
  );
}
