import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VALID_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "magiclink",
  "recovery",
  "invite",
  "email",
  "email_change",
];

function safeNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith("/")) return "/today";
  if (nextPath.startsWith("/auth")) return "/today";
  return nextPath;
}

function buildLoginRedirect(request: NextRequest, nextPath: string, error: string) {
  const url = new URL("/auth/login", request.url);
  url.searchParams.set("next", nextPath);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  const intent = request.nextUrl.searchParams.get("intent");
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const typeParam = request.nextUrl.searchParams.get("type");
  const providerError = request.nextUrl.searchParams.get("error_description");

  if (providerError) {
    return buildLoginRedirect(request, nextPath, providerError);
  }

  const supabase = await getServerSupabaseClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return buildLoginRedirect(request, nextPath, "Magic link is invalid or expired. Please request a new one.");
    }
    if (intent === "signup") {
      return NextResponse.redirect(new URL(`/auth/set-password?next=${encodeURIComponent(nextPath)}`, request.url));
    }
    if (intent === "recovery") {
      return NextResponse.redirect(
        new URL(`/auth/reset-password?next=${encodeURIComponent(nextPath)}`, request.url)
      );
    }
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (tokenHash && typeParam) {
    const otpType = typeParam as EmailOtpType;
    if (!VALID_OTP_TYPES.includes(otpType)) {
      return buildLoginRedirect(request, nextPath, "Invalid verification link type.");
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (error) {
      return buildLoginRedirect(request, nextPath, "Magic link is invalid or expired. Please request a new one.");
    }

    if (intent === "signup" || otpType === "signup") {
      return NextResponse.redirect(new URL(`/auth/set-password?next=${encodeURIComponent(nextPath)}`, request.url));
    }
    if (intent === "recovery" || otpType === "recovery") {
      return NextResponse.redirect(
        new URL(`/auth/reset-password?next=${encodeURIComponent(nextPath)}`, request.url)
      );
    }

    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  return buildLoginRedirect(request, nextPath, "Verification link is missing required parameters.");
}
