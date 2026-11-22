import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { ApiError } from "@/lib/api";
import type { AuthUser, Role } from "@/lib/types";

export const TOKEN_COOKIE = "coffeeshop_token";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  return token ? verifyToken(token) : null;
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export function userFromRequest(req: NextRequest): AuthUser | null {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  return token ? verifyToken(token) : null;
}

export function requireApiUser(req: NextRequest): AuthUser {
  const user = userFromRequest(req);
  if (!user) throw new ApiError(401, "Not authenticated");
  return user;
}

export function requireApiRole(req: NextRequest, ...roles: Role[]): AuthUser {
  const user = requireApiUser(req);
  if (!roles.includes(user.role)) throw new ApiError(403, "Insufficient permissions");
  return user;
}
