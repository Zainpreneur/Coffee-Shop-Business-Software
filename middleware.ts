import { NextResponse, type NextRequest } from "next/server";

const TOKEN_COOKIE = "coffeeshop_token";

export function middleware(req: NextRequest) {
  if (!req.cookies.get(TOKEN_COOKIE)?.value) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
