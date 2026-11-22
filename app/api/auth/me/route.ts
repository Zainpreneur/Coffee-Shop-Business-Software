import { route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";

export const GET = route((req) => ({ user: requireApiUser(req) }));
