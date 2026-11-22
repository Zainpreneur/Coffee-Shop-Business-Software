import { requestBody, route } from "@/lib/api";
import { requireApiRole, requireApiUser } from "@/lib/auth";
import { createCategory, listCategories } from "@/lib/services/menu";

export const GET = route((req) => {
  requireApiUser(req);
  return listCategories();
});

export const POST = route(async (req) => {
  requireApiRole(req, "admin", "manager");
  return createCategory(await requestBody(req));
});
