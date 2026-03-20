begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 15: Fix credit guard RPC schema resolution
--
-- The Supabase project exposes these schemas via PostgREST:
--   billing, identity, interpretation, astro_core, astro_artifacts, platform, chat
-- `public` is intentionally NOT exposed.
--
-- The application code was calling supabase.rpc("consume_provider_credits")
-- which defaults to Content-Profile: public → "Invalid schema: public".
-- The correct call is supabase.schema('platform').rpc(...) — fixed in runtime.ts.
--
-- This migration documents the resolution and drops the unused public wrapper
-- if it was ever accidentally created.
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.consume_provider_credits(text, int, int, int, int);

commit;
