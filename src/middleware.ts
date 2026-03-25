import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that don't require authentication
const publicRoutes = ["/", "/login", "/signup", "/invite"];
// Routes that require authentication but not onboarding
const authOnlyRoutes = ["/onboarding"];
// API routes that don't require authentication
const publicApiRoutes = ["/api/auth/signup", "/api/auth/check-onboarding"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public API routes
  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow NextAuth routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow tRPC routes - they handle auth in their context
  if (pathname.startsWith("/api/trpc")) {
    return NextResponse.next();
  }

  // Get the token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // If not authenticated and trying to access protected route
  if (!token && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access login/signup
  if (token && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Check onboarding status for authenticated users
  if (token && !isPublicRoute && !authOnlyRoutes.some((route) => pathname.startsWith(route))) {
    // We'll handle onboarding check in the page component
    // This avoids making DB calls in middleware
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
