import { idParam, requestBody, route } from "@/lib/api";
import { requireApiRole } from "@/lib/auth";
import { adjustInventory } from "@/lib/services/inventory";

interface Context {
  params: Promise<{ id: string }>;
}

export const POST = route(async (req, ctx: Context) => {
  const user = requireApiRole(req, "admin", "manager");
  return adjustInventory(idParam((await ctx.params).id), await requestBody(req), user.id);
});
