import { idParam, requestBody, route } from "@/lib/api";
import { requireApiRole, requireApiUser } from "@/lib/auth";
import { deleteItem, getItem, updateItem } from "@/lib/services/menu";

interface Context {
  params: Promise<{ id: string }>;
}

export const GET = route(async (req, ctx: Context) => {
  requireApiUser(req);
  return getItem(idParam((await ctx.params).id));
});

export const PUT = route(async (req, ctx: Context) => {
  requireApiRole(req, "admin", "manager");
  return updateItem(idParam((await ctx.params).id), await requestBody(req));
});

export const DELETE = route(async (req, ctx: Context) => {
  requireApiRole(req, "admin", "manager");
  deleteItem(idParam((await ctx.params).id));
});
