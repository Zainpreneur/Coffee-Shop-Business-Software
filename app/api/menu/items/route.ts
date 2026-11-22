import { requestBody, route } from "@/lib/api";
import { requireApiRole, requireApiUser } from "@/lib/auth";
import { createItem, listItems } from "@/lib/services/menu";

export const GET = route((req) => {
  requireApiUser(req);
  return listItems(req.nextUrl.searchParams.get("all") === "1");
});

export const POST = route(async (req) => {
  requireApiRole(req, "admin", "manager");
  return createItem(await requestBody(req));
});
