import { route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { listOrders } from "@/lib/services/orders";

export const GET = route((req) => {
  requireApiUser(req);
  const q = req.nextUrl.searchParams;
  return listOrders({
    status: q.get("status") ?? undefined,
    from: q.get("from") ?? undefined,
    to: q.get("to") ?? undefined,
    limit: q.get("limit") ?? undefined,
  });
});
