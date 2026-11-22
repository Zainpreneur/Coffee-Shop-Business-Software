import { idParam, requestBody, route } from "@/lib/api";
import { requireApiRole } from "@/lib/auth";
import { deleteEmployee, updateEmployee } from "@/lib/services/employees";

interface Context {
  params: Promise<{ id: string }>;
}

export const PUT = route(async (req, ctx: Context) => {
  requireApiRole(req, "admin");
  return updateEmployee(idParam((await ctx.params).id), await requestBody(req));
});

export const DELETE = route(async (req, ctx: Context) => {
  const user = requireApiRole(req, "admin");
  deleteEmployee(idParam((await ctx.params).id), user.id);
});
