import { idParam, requestBody, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { deleteCustomer, getCustomer, updateCustomer } from "@/lib/services/customers";

interface Context {
  params: Promise<{ id: string }>;
}

export const GET = route(async (req, ctx: Context) => {
  requireApiUser(req);
  return getCustomer(idParam((await ctx.params).id));
});

export const PUT = route(async (req, ctx: Context) => {
  requireApiUser(req);
  return updateCustomer(idParam((await ctx.params).id), await requestBody(req));
});

export const DELETE = route(async (req, ctx: Context) => {
  requireApiUser(req);
  deleteCustomer(idParam((await ctx.params).id));
});
