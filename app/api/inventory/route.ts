import { requestBody, route } from "@/lib/api";
import { requireApiRole, requireApiUser } from "@/lib/auth";
import { createInventory, listInventory } from "@/lib/services/inventory";

export const GET = route((req) => {
  requireApiUser(req);
  return listInventory(req.nextUrl.searchParams.get("low") === "1");
});

export const POST = route(async (req) => {
  requireApiRole(req, "admin", "manager");
  return createInventory(await requestBody(req));
});
