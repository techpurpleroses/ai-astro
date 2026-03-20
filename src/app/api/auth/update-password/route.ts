import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const logger = createServerLogger("api.auth.update-password");

const UpdatePasswordSchema = z.object({
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  return observeApiRoute({
    scope: "api.auth.update-password.POST",
    request,
    handler: async () => {
      try {
        const body = await request.json();
        const input = UpdatePasswordSchema.parse(body);
        logger.info("request.validated", { passwordLength: input.password.length });
        const supabase = await getServerSupabaseClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          logger.warn("request.unauthorized");
          return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { error } = await supabase.auth.updateUser({
          password: input.password,
        });
        if (error) {
          throw new Error(error.message);
        }

        return NextResponse.json({ ok: true });
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
            error: error instanceof Error ? error.message : "Unable to update password.",
          },
          { status: 400 }
        );
      }
    },
  });
}
