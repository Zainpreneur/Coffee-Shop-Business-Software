import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, parse, requestBody, route } from "@/lib/api";
import { signToken, TOKEN_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AuthUser } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST = route(async (req) => {
  const { email, password } = parse(loginSchema, await requestBody(req));

  const user = db.prepare("SELECT * FROM users WHERE email = ? AND active = 1").get(email) as
    | (AuthUser & { password_hash: string })
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new ApiError(401, "Invalid email or password");
  }

  const payload: AuthUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  const response = NextResponse.json({ user: payload });
  response.cookies.set(TOKEN_COOKIE, signToken(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
});
