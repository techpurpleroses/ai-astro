import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { randomUUID } from "crypto";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { buildAuthRedirectUrl, normalizeNextPath } from "@/lib/auth/flow";

export const runtime = "nodejs";

const SignupSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(2).max(100),
  next: z.string().default("/today"),
});

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "***";
  if (name.length <= 2) return `${name[0] ?? "*"}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = SignupSchema.parse(body);
    const supabase = await getServerSupabaseClient();

    const nextPath = normalizeNextPath(input.next);
    const redirectTo = buildAuthRedirectUrl(request, "signup", nextPath);

    const temporaryPassword = `tmp_${randomUUID()}_Aa1!`;
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: temporaryPassword,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          display_name: input.fullName,
        },
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    const identities = data.user?.identities ?? [];
    const isExistingAccountSignupAttempt = identities.length === 0;

    if (isExistingAccountSignupAttempt) {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: input.email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (resendError && process.env.NODE_ENV !== "production") {
        console.warn("[auth/signup] resend failed", {
          email: maskEmail(input.email),
          message: resendError.message,
        });
      }

      return NextResponse.json({
        ok: true,
        message:
          "Check your email and confirm your account. If already confirmed, please log in or use Forgot password.",
      });
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[auth/signup] verification email requested", {
        email: maskEmail(input.email),
        hasSession: Boolean(data.session),
        redirectTo,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Check your email and confirm your account.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid request payload.", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to create account.",
      },
      { status: 400 }
    );
  }
}
