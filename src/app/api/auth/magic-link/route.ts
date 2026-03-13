import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MagicLinkSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(2).max(100),
  next: z.string().default("/today"),
});

function normalizeNext(nextPath: string): string {
  if (!nextPath.startsWith("/")) return "/today";
  if (nextPath.startsWith("/auth")) return "/today";
  return nextPath;
}

function authPublicBaseUrl(request: NextRequest): string {
  const configured = process.env.AUTH_PUBLIC_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return request.nextUrl.origin.replace(/\/+$/, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = MagicLinkSchema.parse(body);
    const supabase = await getServerSupabaseClient();

    const nextPath = normalizeNext(input.next);
    const redirectUrl = new URL("/auth/callback", authPublicBaseUrl(request));
    redirectUrl.searchParams.set("next", nextPath);
    redirectUrl.searchParams.set("intent", "signup");

    const { error } = await supabase.auth.signInWithOtp({
      email: input.email,
      options: {
        emailRedirectTo: redirectUrl.toString(),
        shouldCreateUser: true,
        data: {
          display_name: input.fullName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      message:
        "Verification link sent. After verification, you will set your password.",
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
        error: error instanceof Error ? error.message : "Unable to send magic link.",
      },
      { status: 400 }
    );
  }
}
