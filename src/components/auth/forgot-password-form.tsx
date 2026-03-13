"use client";

import Link from "next/link";
import { useState } from "react";

interface ForgotPasswordFormProps {
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

export function ForgotPasswordForm({ nextPath, initialError = null }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          next: nextPath,
        }),
      });

      const body = (await res.json()) as ApiResponse;
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? "Unable to send reset link.");
      }

      setSuccessMessage(body.message ?? "Reset link sent. Check your email.");
      setEmail("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send reset link.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060D1B] text-white px-5 py-12">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
        <h1 className="font-mystical text-3xl leading-tight text-[#F4E2B4]">Reset Password</h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter your email. We will send a secure reset link.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            {submitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-400">
          <Link
            href={`/auth/login?next=${encodeURIComponent(nextPath)}`}
            className="text-cyan-300 hover:text-cyan-200"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

