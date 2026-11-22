import { requestBody, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { checkout } from "@/lib/services/orders";

export const POST = route(async (req) => {
  const user = requireApiUser(req);
  return checkout(await requestBody(req), user.id);
});
