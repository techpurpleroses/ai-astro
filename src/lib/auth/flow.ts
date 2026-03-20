import { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export type AuthIntent = "signup" | "recovery";

export const VALID_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "magiclink",
  "recovery",
  "invite",
  "email",
  "email_change",
];

const DEFAULT_AUTH_CALLBACK_PATH = "/auth/callback";

function normalizeCallbackPath(pathValue: string): string {
  if (!pathValue.startsWith("/")) return DEFAULT_AUTH_CALLBACK_PATH;
  return pathValue;
}

export function normalizeNextPath(nextPath: string | null | undefined): string {
  if (!nextPath || !nextPath.startsWith("/")) return "/today";
  if (nextPath.startsWith("/auth")) return "/today";
  return nextPath;
}

export function authPublicBaseUrl(request: NextRequest): string {
  const configured = process.env.AUTH_PUBLIC_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const rawBase = (configured || request.nextUrl.origin).replace(/\/+$/, "");

  let parsed: URL;
  try {
    parsed = new URL(rawBase);
  } catch {
    throw new Error("Invalid AUTH_PUBLIC_URL. Use a full URL like https://app.example.com");
  }

  const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (process.env.NODE_ENV === "production" && isLocalhost) {
    throw new Error("AUTH_PUBLIC_URL must be your production domain, not localhost.");
  }

  return parsed.toString().replace(/\/+$/, "");
}

export function authCallbackPath(): string {
  const configured = process.env.AUTH_CALLBACK_PATH?.trim();
  if (!configured) return DEFAULT_AUTH_CALLBACK_PATH;
  return normalizeCallbackPath(configured);
}

export function buildAuthRedirectUrl(
  request: NextRequest,
  intent: AuthIntent,
  nextPath: string
): string {
  const url = new URL(authCallbackPath(), authPublicBaseUrl(request));
  url.searchParams.set("next", normalizeNextPath(nextPath));
  url.searchParams.set("intent", intent);
  return url.toString();
}
