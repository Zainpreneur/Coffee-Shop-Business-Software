import { idParam, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getOrder } from "@/lib/services/orders";

interface Context {
  params: Promise<{ id: string }>;
}

export const GET = route(async (req, ctx: Context) => {
  requireApiUser(req);
  return getOrder(idParam((await ctx.params).id));
});
