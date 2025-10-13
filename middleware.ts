import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Note: For admin-only routes, check permissions in the page/API route itself
  // Middleware should only handle authentication, not authorization
  // Use the isUserAdmin() helper from lib/permissions.ts in your pages/actions

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
