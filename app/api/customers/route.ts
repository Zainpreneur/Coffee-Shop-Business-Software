import { requestBody, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { createCustomer, listCustomers } from "@/lib/services/customers";

export const GET = route((req) => {
  requireApiUser(req);
  return listCustomers(req.nextUrl.searchParams.get("q") ?? undefined);
});

export const POST = route(async (req) => {
  requireApiUser(req);
  return createCustomer(await requestBody(req));
});
