"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { astroFetchJson } from "@/lib/client/astro-fetch";
import { BRAND_NAME } from "@/lib/brand";

type AuthMode = "login" | "signup";

interface AuthFormProps {
  mode: AuthMode;
  nextPath: string;
  initialError?: string | null;
}

interface ApiResponse {
  ok: boolean;
  message?: string;
  error?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function MagicLinkForm({ mode, nextPath, initialError = null }: AuthFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  const title = useMemo(() => {
    return mode === "signup" ? `Create Your ${BRAND_NAME} Account` : `Log In To ${BRAND_NAME}`;
  }, [mode]);

  const subtitle = useMemo(() => {
    return mode === "signup"
      ? "Create your account. Check your email and confirm."
      : "Use your email and password to log in.";
  }, [mode]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (mode === "signup" && fullName.trim().length < 2) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (mode === "login" && password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/magic-link" : "/api/auth/login";
      const debugOrigin =
        mode === "signup"
          ? "components.auth.magic-link.signup"
          : "components.auth.magic-link.login";
      const payload =
        mode === "signup"
          ? {
              email,
              fullName: fullName.trim(),
              next: nextPath,
            }
          : {
              email,
              password,
            };

      const body = await astroFetchJson<ApiResponse>(endpoint, {
        debugOrigin,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!body.ok) {
        throw new Error(body.error ?? "Authentication request failed.");
      }

      if (mode === "signup") {
        setSuccessMessage(
          body.message ?? "Check your email and confirm your account."
        );
        setFullName("");
      } else {
        queryClient.clear();
        router.replace(nextPath);
        router.refresh();
      }
      setPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Authentication request failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060D1B] text-white px-5 py-12">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
        <h1 className="font-mystical text-3xl leading-tight text-[#F4E2B4]">{title}</h1>
        <p className="mt-2 text-sm text-slate-300">{subtitle}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "signup" ? (
            <div>
              <label htmlFor="fullName" className="mb-1 block text-xs text-slate-300">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                className="w-full rounded-lg border border-white/15 bg-[#0E1B31] px-3 py-2.5 text-sm outline-none focus:border-cyan-400"
                placeholder="Your name"
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className="mb-1 block text-xs text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-lg border border-white/15 bg-[#0E1B31] px-3 py-2.5 text-sm outline-none focus:border-cyan-400"
              placeholder="you@example.com"
              required
            />
          </div>

          {mode === "login" ? (
            <div>
              <label htmlFor="password" className="mb-1 block text-xs text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-white/15 bg-[#0E1B31] px-3 py-2.5 text-sm outline-none focus:border-cyan-400"
                placeholder="Your password"
                required
              />
            </div>
          ) : null}

          {errorMessage ? (
            <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 px-4 py-3 text-sm font-semibold text-[#061327] disabled:opacity-60"
          >
            {submitting
              ? "Please wait..."
              : mode === "signup"
                ? "Sign Up"
                : "Log In"}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-400">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Link
                href={`/auth/login?next=${encodeURIComponent(nextPath)}`}
                className="text-cyan-300 hover:text-cyan-200"
              >
                Log in
              </Link>
            </>
          ) : (
            <>
              Forgot password?{" "}
              <Link
                href={`/auth/forgot-password?next=${encodeURIComponent(nextPath)}`}
                className="text-cyan-300 hover:text-cyan-200"
              >
                Reset here
              </Link>
            </>
          )}
        </div>

        <div className="mt-2 text-center text-xs text-slate-400">
          {mode === "signup" ? null : (
            <>
              New to {BRAND_NAME}?{" "}
              <Link
                href={`/auth/signup?next=${encodeURIComponent(nextPath)}`}
                className="text-cyan-300 hover:text-cyan-200"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
