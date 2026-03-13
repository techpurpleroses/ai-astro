# AstroAI Auth Production Runbook

## Goal

Provide a stable signup/login flow across browsers and devices with:

- Email + password login
- Email verification for signup
- Password reset flow
- Server-readable sessions in Next.js via Supabase SSR cookies

## Key truth (important)

- Account identity is global (works on any device).
- Session is per device/browser (cookie-bound).
- This is standard and correct for production SaaS.

## Current code paths

- Signup API: `POST /api/auth/magic-link` (signup flow, not login magic-link)
- Login API: `POST /api/auth/login` (email + password)
- Forgot password API: `POST /api/auth/forgot-password`
- Update password API: `POST /api/auth/update-password`
- Callback page (hash-token compatible): `/auth/callback`
- Server confirm route (token_hash/code mode): `/auth/confirm`

## Environment variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_APP_URL`
- `AUTH_PUBLIC_URL`
- `AUTH_CALLBACK_PATH`

Recommended production values:

- `NEXT_PUBLIC_APP_URL=https://your-domain.com`
- `AUTH_PUBLIC_URL=https://your-domain.com`
- `AUTH_CALLBACK_PATH=/auth/callback` (safe default with Supabase default email template)

## Supabase dashboard settings (must do)

1. `Authentication -> URL Configuration -> Site URL`
   - Set to your production domain (not localhost).
2. `Authentication -> URL Configuration -> Redirect URLs`
   - Add production: `https://your-domain.com/**`
   - Add local dev: `http://localhost:3000/**`
3. `Authentication -> Sign In / Providers`
   - Enable `Email`.
   - Keep `Confirm email` enabled.
   - Keep password sign-in enabled.
4. `Authentication -> Email`
   - Configure SMTP provider for production deliverability (do not rely on default test SMTP at scale).

## Two supported confirmation modes

### Mode A (default and easiest): hash-token callback

Use:

- `AUTH_CALLBACK_PATH=/auth/callback`

This works with default Supabase email templates (`.ConfirmationURL` links).

### Mode B (server-first confirm): token_hash links

Use only after changing email templates to token_hash links.

1. Set:
   - `AUTH_CALLBACK_PATH=/auth/confirm`
2. Update Supabase email templates to include token_hash URL format.

Example signup template link:

```txt
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/today&intent=signup
```

Example recovery template link:

```txt
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/today&intent=recovery
```

If you do not update templates, keep Mode A.

## Cross-device testing rules

1. Localhost links are not cross-device usable.
2. For real cross-device tests, use deployed domain links.
3. Always click the latest email link (tokens are one-time + time-limited).

## Security notes

1. Rotate any keys that were ever exposed in logs/screenshots/chats.
2. Keep service-role keys only on server, never in client bundles.
3. Restrict redirect URLs to known domains only.
4. Use HTTPS only in production.

## Quick validation checklist

1. Signup sends verification email.
2. Verification link opens and routes user to `set-password`.
3. User sets password and lands on `/today`.
4. Logout works.
5. Login with email + password works on:
   - same browser
   - another browser
   - another device
6. Forgot-password email routes to `reset-password` and updates password.
