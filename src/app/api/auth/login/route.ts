import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const logger = createServerLogger("api.auth.login");

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  return observeApiRoute({
    scope: "api.auth.login.POST",
    request,
    handler: async () => {
      try {
        const body = await request.json();
        const input = LoginSchema.parse(body);
        logger.info("request.validated", { email: input.email });
        const supabase = await getServerSupabaseClient();

        const { error } = await supabase.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        });

        if (error) {
          logger.warn("request.denied", { email: input.email, message: error.message });
          return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
        }

        return NextResponse.json({ ok: true });
      } catch (error) {
        if (error instanceof ZodError) {
          logger.warn("request.invalid", { error });
          return NextResponse.json(
            { ok: false, error: "Invalid login payload.", details: error.flatten() },
            { status: 400 }
          );
        }

        logger.error("request.error", { error });
        return NextResponse.json(
          {
            ok: false,
            error: error instanceof Error ? error.message : "Unable to sign in.",
          },
          { status: 400 }
        );
      }
    },
  });
}
