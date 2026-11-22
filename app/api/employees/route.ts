import { requestBody, route } from "@/lib/api";
import { requireApiRole } from "@/lib/auth";
import { createEmployee, listEmployees } from "@/lib/services/employees";

export const GET = route((req) => {
  requireApiRole(req, "admin", "manager");
  return listEmployees();
});

export const POST = route(async (req) => {
  requireApiRole(req, "admin");
  return createEmployee(await requestBody(req));
});
