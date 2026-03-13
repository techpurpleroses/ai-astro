import { NextResponse, type NextRequest } from "next/server";
import { refreshAuthSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/today",
  "/advisors",
  "/features",
  "/compatibility",
  "/birth-chart",
  "/settings",
];

const PASSWORD_FLOW_PAGES = ["/auth/set-password", "/auth/reset-password"];
const GUEST_AUTH_PAGES = ["/auth/login", "/auth/signup", "/auth/forgot-password"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAuthPath(pathname: string): boolean {
  return GUEST_AUTH_PAGES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isPasswordFlowPath(pathname: string): boolean {
  return PASSWORD_FLOW_PAGES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const { response, user } = await refreshAuthSession(request);

  if ((isProtectedPath(pathname) || isPasswordFlowPath(pathname)) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthPath(pathname)) {
    const redirectTo = request.nextUrl.searchParams.get("next") || "/today";
    const url = request.nextUrl.clone();
    url.pathname = redirectTo.startsWith("/") ? redirectTo : "/today";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
