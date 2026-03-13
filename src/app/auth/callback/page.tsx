"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

const VALID_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "magiclink",
  "recovery",
  "invite",
  "email",
  "email_change",
];

function normalizeNext(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith("/")) return "/today";
  if (nextPath.startsWith("/auth")) return "/today";
  return nextPath;
}

function toHashParams(hashValue: string): URLSearchParams {
  const normalized = hashValue.startsWith("#") ? hashValue.slice(1) : hashValue;
  return new URLSearchParams(normalized);
}

function buildLoginRedirect(nextPath: string, error: string): string {
  const params = new URLSearchParams({
    next: nextPath,
    error,
  });
  return `/auth/login?${params.toString()}`;
}

function resolveNextRoute(nextPath: string, flowType: string | null): string {
  if (flowType === "signup") {
    return `/auth/set-password?next=${encodeURIComponent(nextPath)}`;
  }
  if (flowType === "recovery") {
    return `/auth/reset-password?next=${encodeURIComponent(nextPath)}`;
  }
  return nextPath;
}

function CallbackCard({ processingError }: { processingError: string | null }) {
  return (
    <div className="min-h-screen bg-[#060D1B] text-white px-5 py-12">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-xl shadow-black/20">
        <h1 className="font-mystical text-3xl leading-tight text-[#F4E2B4]">Verifying Your Account</h1>
        <p className="mt-3 text-sm text-slate-300">Please wait while we confirm your email link.</p>
        {processingError ? (
          <p className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
            {processingError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [processingError, setProcessingError] = useState<string | null>(null);

  const nextPath = useMemo(() => normalizeNext(searchParams.get("next")), [searchParams]);
  const intent = useMemo(() => searchParams.get("intent"), [searchParams]);

  useEffect(() => {
    let active = true;

    async function run() {
      const supabase = getBrowserSupabaseClient();
      const hashParams = toHashParams(window.location.hash);
      const hashErrorDescription = hashParams.get("error_description");
      const queryErrorDescription = searchParams.get("error_description");
      const providerError = queryErrorDescription ?? hashErrorDescription;

      if (providerError) {
        router.replace(buildLoginRedirect(nextPath, providerError));
        return;
      }

      const hashAccessToken = hashParams.get("access_token");
      const hashRefreshToken = hashParams.get("refresh_token");
      const hashType = hashParams.get("type");

      // Clear sensitive hash tokens from URL as soon as we parse them.
      if (window.location.hash) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      }

      if (hashAccessToken && hashRefreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken,
        });

        if (error) {
          router.replace(
            buildLoginRedirect(nextPath, "Email link is invalid or has expired. Please request a new one.")
          );
          return;
        }

        const flowType = intent ?? hashType;
        router.replace(resolveNextRoute(nextPath, flowType));
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace(
            buildLoginRedirect(nextPath, "Email link is invalid or has expired. Please request a new one.")
          );
          return;
        }

        const flowType = intent ?? searchParams.get("type");
        router.replace(resolveNextRoute(nextPath, flowType));
        return;
      }

      const tokenHash = searchParams.get("token_hash");
      const typeParam = searchParams.get("type");
      if (tokenHash && typeParam) {
        const otpType = typeParam as EmailOtpType;
        if (!VALID_OTP_TYPES.includes(otpType)) {
          router.replace(buildLoginRedirect(nextPath, "Invalid verification link type."));
          return;
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });

        if (error) {
          router.replace(
            buildLoginRedirect(nextPath, "Email link is invalid or has expired. Please request a new one.")
          );
          return;
        }

        const flowType = intent ?? otpType;
        router.replace(resolveNextRoute(nextPath, flowType));
        return;
      }

      if (!active) return;
      setProcessingError("Verification link is missing required parameters. Please request a new email.");
      router.replace(
        buildLoginRedirect(nextPath, "Verification link is missing required parameters. Please request a new email.")
      );
    }

    void run().catch(() => {
      if (!active) return;
      setProcessingError("Unable to verify this link. Please request a new email.");
      router.replace(buildLoginRedirect(nextPath, "Unable to verify this link. Please request a new email."));
    });

    return () => {
      active = false;
    };
  }, [intent, nextPath, router, searchParams]);

  return <CallbackCard processingError={processingError} />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackCard processingError={null} />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
