import { type NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/settings", "/billing"];

export async function middleware(req: NextRequest) {
  const isProtected = PROTECTED.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Better Auth session cookie name
  const sessionCookie = req.cookies.get("better-auth.session_token");
  if (!sessionCookie) {
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
