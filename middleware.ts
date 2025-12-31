import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

const PROTECTED_PATHS = [
  "/content",
  "/map",
  "/profile",
  "/community",
  "/memoryverse",
  "/settings",
  "/admin",
];

const isProtectedPath = (pathname: string) =>
  PROTECTED_PATHS.some(
    (protectedPath) =>
      pathname === protectedPath || pathname.startsWith(`${protectedPath}/`),
  );

const isAuthPath = (pathname: string) => pathname.startsWith("/auth");

const sanitizeReturnUrl = (value?: string | null) => {
  if (!value) {
    return "/content";
  }

  const decoded =
    typeof value === "string"
      ? (() => {
          try {
            return decodeURIComponent(value);
          } catch {
            return value;
          }
        })()
      : "";

  if (!decoded.startsWith("/")) {
    return "/content";
  }

  const normalized = decoded.startsWith("//") ? decoded.replace(/^\/+/, "/") : decoded;

  if (normalized === "/auth") {
    return "/content";
  }

  return normalized || "/content";
};

export async function middleware(request: NextRequest) {
  const { pathname, searchParams, search } = request.nextUrl;

  const response = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(request, response);
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const isAuthed = Boolean(data?.session);

  const protectedRoute = isProtectedPath(pathname);
  const authRoute = isAuthPath(pathname);

  if (protectedRoute && !isAuthed) {
    const returnUrl = `${pathname}${search}`;
    const redirectUrl = new URL(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (authRoute && isAuthed) {
    const targetUrl = sanitizeReturnUrl(searchParams.get("returnUrl"));
    const redirectUrl = new URL(targetUrl, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/).*)",
  ],
};
