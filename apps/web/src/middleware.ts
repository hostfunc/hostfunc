import { type NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/settings", "/billing"];
const SESSION_COOKIE_NAMES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

export async function middleware(req: NextRequest) {
  const isProtected = PROTECTED.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Better Auth session cookie name
  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) => req.cookies.has(name));
  if (!hasSessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/billing/:path*"],
};
