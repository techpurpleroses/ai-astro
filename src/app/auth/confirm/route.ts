import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeNextPath, VALID_OTP_TYPES } from "@/lib/auth/flow";

export const runtime = "nodejs";

function buildLoginRedirect(request: NextRequest, nextPath: string, error: string): NextResponse {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", nextPath);
  loginUrl.searchParams.set("error", error);
  return NextResponse.redirect(loginUrl);
}

function resolveNextPath(request: NextRequest, nextPath: string, flowType: string | null): NextResponse {
  if (flowType === "signup") {
    const setPasswordUrl = new URL("/auth/set-password", request.url);
    setPasswordUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(setPasswordUrl);
  }

  if (flowType === "recovery") {
    const resetPasswordUrl = new URL("/auth/reset-password", request.url);
    resetPasswordUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(resetPasswordUrl);
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const nextPath = normalizeNextPath(request.nextUrl.searchParams.get("next"));
  const intent = request.nextUrl.searchParams.get("intent");
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const typeParam = request.nextUrl.searchParams.get("type");

  const providerError =
    request.nextUrl.searchParams.get("error_description") ||
    request.nextUrl.searchParams.get("error");
  if (providerError) {
    return buildLoginRedirect(request, nextPath, providerError);
  }

  const supabase = await getServerSupabaseClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return buildLoginRedirect(
        request,
        nextPath,
        "Email verification link is invalid or expired. Please request a new one."
      );
    }

    const flowType = intent ?? typeParam;
    return resolveNextPath(request, nextPath, flowType);
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
      return buildLoginRedirect(
        request,
        nextPath,
        "Email verification link is invalid or expired. Please request a new one."
      );
    }

    const flowType = intent ?? otpType;
    return resolveNextPath(request, nextPath, flowType);
  }

  // If you see this after clicking a Supabase default link, it likely used hash-fragment tokens.
  // In that case, point redirect_to to /auth/callback or switch email templates to token_hash mode.
  return buildLoginRedirect(
    request,
    nextPath,
    "Verification link is missing required parameters. Please request a new email."
  );
}
