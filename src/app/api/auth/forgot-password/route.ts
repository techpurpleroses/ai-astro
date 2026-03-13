import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { buildAuthRedirectUrl, normalizeNextPath } from "@/lib/auth/flow";

export const runtime = "nodejs";

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
  next: z.string().default("/today"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = ForgotPasswordSchema.parse(body);
    const supabase = await getServerSupabaseClient();

    const nextPath = normalizeNextPath(input.next);
    const redirectTo = buildAuthRedirectUrl(request, "recovery", nextPath);

    const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Reset password link sent. Check your email.",
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
        error: error instanceof Error ? error.message : "Unable to send reset link.",
      },
      { status: 400 }
    );
  }
}
