import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/uploads") ||
    pathname.match(/\.(png|apng|jpg|jpeg|jfif|pjpeg|pjp|gif|svg|webp|avif|heic|heif|bmp|dib|tif|tiff|ico|css|js|map|woff|woff2|ttf|eot)$/i)
  ) {
    return NextResponse.next();
  }

  // Allow access to dashboard routes - AuthGate will handle authentication UI
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return NextResponse.next();
  }

  // Redirect root to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Default: allow all other routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
