"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface PasswordUpdateFormProps {
  mode: "set" | "reset";
  nextPath: string;
  initialError?: string | null;
}

interface ApiResponse {
  ok: boolean;
  error?: string;
}

export function PasswordUpdateForm({
  mode,
  nextPath,
  initialError = null,
}: PasswordUpdateFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  const title = mode === "set" ? "Set Your Password" : "Choose New Password";
  const subtitle =
    mode === "set"
      ? "Your email is verified. Set your account password to complete signup."
      : "Set a new password for your account.";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const body = (await res.json()) as ApiResponse;
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? "Unable to update password.");
      }

      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update password.");
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
          <div>
            <label htmlFor="password" className="mb-1 block text-xs text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-white/15 bg-[#0E1B31] px-3 py-2.5 text-sm outline-none focus:border-cyan-400"
              placeholder="Minimum 8 characters"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-xs text-slate-300">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-white/15 bg-[#0E1B31] px-3 py-2.5 text-sm outline-none focus:border-cyan-400"
              placeholder="Re-enter password"
              required
            />
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 px-4 py-3 text-sm font-semibold text-[#061327] disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Password"}
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

