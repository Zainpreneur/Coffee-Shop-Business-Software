import { idParam, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { cancelOrder } from "@/lib/services/orders";

interface Context {
  params: Promise<{ id: string }>;
}

export const POST = route(async (req, ctx: Context) => {
  const user = requireApiUser(req);
  return cancelOrder(idParam((await ctx.params).id), user.id);
});
