import { idParam, route } from "@/lib/api";
import { requireApiRole } from "@/lib/auth";
import { listMovements } from "@/lib/services/inventory";

interface Context {
  params: Promise<{ id: string }>;
}

export const GET = route(async (req, ctx: Context) => {
  requireApiRole(req, "admin", "manager");
  return listMovements(idParam((await ctx.params).id));
});
