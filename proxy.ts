import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  "/login",
  "/invite",
  "/api/auth",
  "/share",
  "/_next",
  "/favicon.ico",
];

export default auth((req) => {
  const { nextUrl } = req as NextRequest;
  const session = req.auth;
  const path = nextUrl.pathname;

  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  if (isPublic) return NextResponse.next();

  if (!session) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Non-admin users can't access /admin
  if (path.startsWith("/admin") && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
