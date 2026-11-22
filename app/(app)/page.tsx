import { DashboardView } from "@/components/DashboardView";
import { requireUser } from "@/lib/auth";
import * as reports from "@/lib/services/reports";

export default async function DashboardPage() {
  await requireUser();

  const summary = reports.summary();
  const revenue = reports.revenueByDay(14);
  const topItems = reports.topItems(6);
  const lowStock = reports.lowStock();

  return <DashboardView summary={summary} revenue={revenue} topItems={topItems} lowStock={lowStock} />;
}
