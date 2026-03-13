"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function getBrowserEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase browser env is missing.");
  }

  return { url, anonKey };
}

export function getBrowserSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const env = getBrowserEnv();
  browserClient = createBrowserClient(env.url, env.anonKey);
  return browserClient;
}

