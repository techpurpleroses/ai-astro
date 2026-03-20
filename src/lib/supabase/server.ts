import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export async function getServerSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Parameters<typeof cookieStore.set>[2];
        }>
      ) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch (err) {
          // Server Components cannot write cookies — this is expected and safe to ignore.
          // Route Handlers can write cookies; if this throws there, session persistence
          // will silently fail, so log it to surface the issue.
          if (process.env.NODE_ENV !== "production") {
            console.error("[supabase/server] setAll failed:", err);
          }
        }
      },
    },
  });
}
