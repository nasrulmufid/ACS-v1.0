import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/_next",
  "/favicon.ico",
  "/public",
  "/api/health", // allow potential health endpoint
];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p)) ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|map)$/.test(pathname);

  const auth = req.cookies.get("auth")?.value;

  if (isPublic) {
    // If visiting login while already authenticated, redirect home
    if (pathname.startsWith("/login") && auth === "ok") {
      const url = new URL("/", req.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Protect all other routes
  if (auth !== "ok") {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};