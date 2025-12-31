import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

const protectedPaths = ["/content", "/map", "/profile", "/settings", "/community", "/admin"];

const isProtectedPath = (pathname: string) =>
  protectedPaths.some(
    (protectedPath) =>
      pathname === protectedPath || pathname.startsWith(`${protectedPath}/`),
  );

const buildRedirectUrl = (request: NextRequest) => {
  const redirectUrl = new URL("/auth", request.url);
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (returnTo && returnTo !== "/auth") {
    redirectUrl.searchParams.set("returnTo", returnTo);
  }

  return redirectUrl;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname) || pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(request, response);

  if (!supabase) {
    return NextResponse.redirect(buildRedirectUrl(request));
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    return NextResponse.redirect(buildRedirectUrl(request));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
