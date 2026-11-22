import { idParam, requestBody, route } from "@/lib/api";
import { requireApiRole } from "@/lib/auth";
import { deleteCategory, updateCategory } from "@/lib/services/menu";

interface Context {
  params: Promise<{ id: string }>;
}

export const PUT = route(async (req, ctx: Context) => {
  requireApiRole(req, "admin", "manager");
  return updateCategory(idParam((await ctx.params).id), await requestBody(req));
});

export const DELETE = route(async (req, ctx: Context) => {
  requireApiRole(req, "admin", "manager");
  deleteCategory(idParam((await ctx.params).id));
});
