import { idParam, requestBody, route } from "@/lib/api";
import { requireApiRole } from "@/lib/auth";
import { deleteInventory, updateInventory } from "@/lib/services/inventory";

interface Context {
  params: Promise<{ id: string }>;
}

export const PUT = route(async (req, ctx: Context) => {
  requireApiRole(req, "admin", "manager");
  return updateInventory(idParam((await ctx.params).id), await requestBody(req));
});

export const DELETE = route(async (req, ctx: Context) => {
  requireApiRole(req, "admin", "manager");
  deleteInventory(idParam((await ctx.params).id));
});
