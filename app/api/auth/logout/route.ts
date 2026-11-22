import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { TOKEN_COOKIE } from "@/lib/auth";

export const POST = route(() => {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
});
