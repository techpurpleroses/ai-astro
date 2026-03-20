import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { randomUUID } from "crypto";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { buildAuthRedirectUrl, normalizeNextPath } from "@/lib/auth/flow";

export const runtime = "nodejs";
const logger = createServerLogger("api.auth.magic-link");

const SignupSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(2).max(100),
  next: z.string().default("/today"),
});

const SIGNUP_SUCCESS_MESSAGE =
  "If this email is eligible, you will receive a verification email. After verification, set your password. If the account is already active, use Log in or Forgot password.";

export async function POST(request: NextRequest) {
  return observeApiRoute({
    scope: "api.auth.magic-link.POST",
    request,
    handler: async () => {
      try {
        const body = await request.json();
        const input = SignupSchema.parse(body);
        logger.info("request.validated", {
          email: input.email,
          fullNameChars: input.fullName.length,
          next: input.next,
        });
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
          await supabase.auth.resend({
            type: "signup",
            email: input.email,
            options: {
              emailRedirectTo: redirectTo,
            },
          });
          logger.info("request.resend_signup", { email: input.email });
          return NextResponse.json({
            ok: true,
            message: SIGNUP_SUCCESS_MESSAGE,
          });
        }

        return NextResponse.json({
          ok: true,
          message: SIGNUP_SUCCESS_MESSAGE,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          logger.warn("request.invalid", { error });
          return NextResponse.json(
            { ok: false, error: "Invalid request payload.", details: error.flatten() },
            { status: 400 }
          );
        }

        logger.error("request.error", { error });
        return NextResponse.json(
          {
            ok: false,
            error: error instanceof Error ? error.message : "Unable to create account.",
          },
          { status: 400 }
        );
      }
    },
  });
}
