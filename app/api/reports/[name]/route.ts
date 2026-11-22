import { ApiError, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import * as reports from "@/lib/services/reports";

interface Context {
  params: Promise<{ name: string }>;
}

const handlers: Record<string, (params: URLSearchParams) => unknown> = {
  summary: () => reports.summary(),
  "revenue-by-day": (params) => reports.revenueByDay(Number(params.get("days")) || 14),
  "top-items": (params) => reports.topItems(Number(params.get("limit")) || 8),
  "low-stock": () => reports.lowStock(),
  "payment-methods": () => reports.paymentMethods(),
};

export const GET = route(async (req, ctx: Context) => {
  requireApiUser(req);
  const { name } = await ctx.params;
  const handler = handlers[name];
  if (!handler) throw new ApiError(404, "Not found");
  return handler(req.nextUrl.searchParams);
});
