import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UpdatePasswordSchema = z.object({
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = UpdatePasswordSchema.parse(body);
    const supabase = await getServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
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
      return NextResponse.json(
        { ok: false, error: "Invalid request payload.", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to update password.",
      },
      { status: 400 }
    );
  }
}

