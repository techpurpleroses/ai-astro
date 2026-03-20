# AstroAI Authentication System

**Complete technical and plain-language guide to how users sign in, stay signed in, and sign out.**

---

## Table of Contents

1. [What is Authentication and Why Does It Matter?](#1-what-is-authentication-and-why-does-it-matter)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [The Session Cookie — The Core Concept](#4-the-session-cookie--the-core-concept)
5. [Flow 1 — Sign Up](#5-flow-1--sign-up)
6. [Flow 2 — Email Verification & Set Password](#6-flow-2--email-verification--set-password)
7. [Flow 3 — Log In](#7-flow-3--log-in)
8. [Flow 4 — Staying Logged In (Session Refresh)](#8-flow-4--staying-logged-in-session-refresh)
9. [Flow 5 — Route Protection (Middleware)](#9-flow-5--route-protection-middleware)
10. [Flow 6 — Forgot Password](#10-flow-6--forgot-password)
11. [Flow 7 — Log Out](#11-flow-7--log-out)
12. [Security Features Baked In](#12-security-features-baked-in)
13. [Key Files Reference](#13-key-files-reference)
14. [Edge Case Scenarios & Confirmation Tests](#14-edge-case-scenarios--confirmation-tests)

---

## 1. What is Authentication and Why Does It Matter?

### Plain English

Imagine the app is a private club. Authentication is the **bouncer at the door** — it checks if someone is who they claim to be before letting them in. Without it, anyone could walk in, read your birth chart, use your paid subscription credits, or even mess with your account.

When you log in, the bouncer gives you a **wristband** (called a session). Every time you try to enter a room (visit a page or make a request), the bouncer checks your wristband. If it's valid, you get in. If it's expired or missing, you're sent back to the front door (the login page).

### Technical

Authentication is the process of verifying a user's identity and establishing a server-trusted session. Our system uses:
- **Identity verification** → Supabase validates email + password credentials
- **Session tokens** → JWT (JSON Web Token) stored in an HTTP-only cookie
- **Server-side session checks** → Every page load re-validates the session against Supabase's auth server

---

## 2. Technology Stack

| Layer | Tool | What It Does |
|-------|------|-------------|
| Auth Provider | **Supabase Auth** | Manages users, passwords, email sending, JWT generation |
| Session Transport | **HTTP-only cookies** (`@supabase/ssr`) | Stores the session token securely in the browser |
| Route Protection | **Next.js Middleware** (`middleware.ts`) | Runs on every page load before the page renders |
| API Validation | **Zod** | Validates the shape of incoming login/signup request bodies |
| Client-side State | **TanStack Query** | Caches profile/billing data on the client side |
| Error Monitoring | **Sentry** (via `observeApiRoute`) | Records auth errors in production |

### Why HTTP-only cookies instead of localStorage?

**Plain English:** localStorage is like a sticky note on your desk — anyone who walks into your office (any JavaScript on the page) can read it. An HTTP-only cookie is like a safe that only the bank (the server) can open — JavaScript on the page cannot touch it at all.

**Technical:** HTTP-only cookies are inaccessible to `document.cookie` and any JavaScript running in the browser, including injected scripts (XSS). This is the gold standard for session storage in web apps.

---

## 3. System Architecture Overview

```
BROWSER                            SERVER (Next.js)                 SUPABASE
───────────────────────────────────────────────────────────────────────────────

User visits /today
      │
      ▼
[Next.js Middleware]  ──── reads session cookie ──► Supabase Auth API
      │                                                    │
      │                                             validates JWT
      │                                                    │
      │◄─────────────── user object (or null) ────────────┘
      │
      ├── User exists? → serve /today page
      └── No user?    → redirect to /auth/login?next=/today


User submits login form
      │
      ▼
[POST /api/auth/login]
      │
      ├── Zod validates body (email + password)
      │
      ├── supabase.auth.signInWithPassword()
      │         │
      │         └──► Supabase Auth API validates credentials
      │                        │
      │              sets JWT + refresh token in response cookies
      │
      └── Browser receives auth cookies (HTTP-only, Secure)
               │
               └── Subsequent requests carry these cookies automatically
```

---

## 4. The Session Cookie — The Core Concept

### Plain English

When you log in, Supabase sends back two things that get saved in your browser as invisible cookies:

1. **Access Token** — A short-lived pass (1 hour). This is checked on every page.
2. **Refresh Token** — A long-lived key (rotates automatically). When your 1-hour pass expires, this key gets you a new one without making you log in again.

You never see these. You never touch them. The browser sends them automatically with every request, like a hotel keycard that works on every door in the building.

### Technical

| Cookie | Type | Duration | Purpose |
|--------|------|----------|---------|
| `sb-{ref}-auth-token` | HTTP-only, Secure | 1 hour (JWT expiry) | Carries the signed JWT with user ID and claims |
| `sb-{ref}-auth-token-code-verifier` | HTTP-only, Secure | Session | PKCE code verifier for OAuth/email code flows |

**JWT Payload contains:**
- `sub` — the user's UUID (primary identifier)
- `email` — verified email address
- `exp` — expiry timestamp
- `aud` — audience (`authenticated`)

**Refresh Token Rotation:** Every time the access token is refreshed, the old refresh token is invalidated and a new one is issued. This means if someone steals a refresh token, using it once invalidates it and the legitimate user's next refresh will fail — alerting them to suspicious activity.

---

## 5. Flow 1 — Sign Up

### Plain English

New users don't create a password directly. Instead, they enter their name and email. We send them a verification email with a special link. Only by clicking that link can they set a real password. This prevents fake signups and ensures every account has a real, accessible email address.

### Step-by-Step

```
1. User fills in: Full Name + Email
           │
           ▼
2. Browser → POST /api/auth/magic-link
   { email, fullName, next: "/today" }
           │
           ▼
3. Server validates with Zod schema
   (email format, name ≥ 2 chars)
           │
           ▼
4. Server generates a one-time temporary password:
   "tmp_<random-uuid>_Aa1!"
   (User never sees this. It's only used internally
    to create the Supabase account before email is verified.)
           │
           ▼
5. Server calls: supabase.auth.signUp({
     email,
     password: temporaryPassword,
     options: {
       emailRedirectTo: "https://app.com/auth/callback?intent=signup&next=/today",
       data: { display_name: fullName }
     }
   })
           │
           ▼
6. Supabase creates the account in the database
   and sends a verification email to the user
           │
           ▼
7. Server checks: does this email already have an account?
   (identities.length === 0 means yes → resend verification email)
           │
           ▼
8. Server returns: { ok: true, message: "Check your email..." }
   (SAME message whether new or existing account — prevents
    attackers from discovering which emails are registered)
           │
           ▼
9. UI shows: "Check your email and confirm your account."
   User is NOT logged in yet. They CANNOT log in
   because the temp password is unknown to them.
```

### Why the temporary password approach?

**Plain English:** We create the account right away so we can send the email through Supabase. But we lock the front door with a password so complex and random that even we don't know it. The only key in is through the email link.

**Technical:** `supabase.auth.signUp()` requires a password field. By generating a cryptographically random UUID-based password, we ensure the account exists in Supabase's system (so the verification email can be sent) but remains inaccessible until the user completes verification and sets their own password via `/auth/set-password`.

---

## 6. Flow 2 — Email Verification & Set Password

### Plain English

The verification email contains a special one-time link. Clicking it does three things: proves you own the email, signs you in temporarily, and takes you to a screen where you set your real password. After that, you're fully set up.

### Step-by-Step

```
1. User clicks link in email
   (e.g. https://app.com/auth/callback?intent=signup&next=/today&token_hash=abc123&type=signup)
           │
           ▼
2. Browser opens /auth/callback (a client-side page)
           │
           ▼
3. Callback page checks URL for three possible token formats:

   FORMAT A — Hash fragment tokens (older Supabase format):
   URL: /auth/callback#access_token=xxx&refresh_token=yyy&type=signup
   → Tokens are in window.location.hash (invisible to server)
   → Code calls: supabase.auth.setSession({ access_token, refresh_token })
   → Hash immediately cleared from URL history (security measure)

   FORMAT B — PKCE code (newer OAuth-compatible format):
   URL: /auth/callback?code=xxx
   → Code calls: supabase.auth.exchangeCodeForSession(code)

   FORMAT C — token_hash OTP (most common Supabase email template format):
   URL: /auth/callback?token_hash=xxx&type=signup
   → Validates type is a known OTP type
   → Code calls: supabase.auth.verifyOtp({ token_hash, type })

           │
           ▼
4. Supabase validates the token → returns a session
   The user is now authenticated (temporary session)
           │
           ▼
5. Callback checks: what flow type is this?
   intent=signup OR type=signup → redirect to /auth/set-password?next=/today
   intent=recovery → redirect to /auth/reset-password?next=/today
   Otherwise → go directly to the `next` path
           │
           ▼
6. User lands on /auth/set-password
   (Middleware confirms: user has a valid session — allowed in)
           │
           ▼
7. User enters new password + confirm password
   (min 8 characters, must match)
           │
           ▼
8. Browser → POST /api/auth/update-password { password }
           │
           ▼
9. Server: getUser() → confirms user is authenticated
   Server: supabase.auth.updateUser({ password })
   → Password is now permanently set
           │
           ▼
10. Browser redirects to /today (or original next path)
    User is now fully signed up and logged in.
```

### Why is there both `/auth/callback` AND `/auth/confirm`?

**Plain English:** Different Supabase email template configurations send links to different places. `/auth/callback` handles the browser-side (client JavaScript) flow. `/auth/confirm` handles the server-side flow. Both do the same verification — they're two doors into the same room, for compatibility.

**Technical:**
- Supabase's default email templates point to `/auth/confirm` (a server Route Handler)
- Our custom email templates point to `/auth/callback` via the `AUTH_CALLBACK_PATH` env var
- `/auth/confirm` handles `token_hash` + `code` formats server-side (more secure, no hash exposure)
- `/auth/callback` additionally handles hash-fragment tokens (`#access_token=...`) which are only accessible in browser JavaScript — a server Route Handler physically cannot read URL fragments

---

## 7. Flow 3 — Log In

### Plain English

Returning users enter their email and password. We check with Supabase that the credentials are correct. If they are, Supabase sends back auth cookies, and the user is taken to the app. The whole process takes under a second.

### Step-by-Step

```
1. User enters: Email + Password
           │
           ▼
2. Browser → POST /api/auth/login
   { email: "user@example.com", password: "mypassword123" }
           │
           ▼
3. Server validates with Zod:
   - email must be valid format
   - password must be ≥ 8 characters
           │
           ▼
4. Server calls: supabase.auth.signInWithPassword({ email, password })
   This call goes to Supabase's servers to verify credentials
           │
           ▼
5a. Success:
    Supabase returns a session (JWT + refresh token)
    The @supabase/ssr library sets these as HTTP-only cookies
    on the response via the setAll() cookie callback
    Server returns: { ok: true }
    Browser receives: { ok: true } + new auth cookies
           │
           ▼
6. Client side:
   - queryClient.clear() — clears any cached data from previous user
   - router.replace(nextPath) — navigates to /today (or original destination)
   - router.refresh() — tells Next.js to re-fetch server components
           │
           ▼
7. User is now on /today, fully authenticated.

5b. Failure:
    Supabase returns an error ("Invalid login credentials")
    Server returns: { ok: false, error: "Invalid login credentials" } (HTTP 401)
    UI shows the error message
    User can try again, or click "Forgot password?"
```

---

## 8. Flow 4 — Staying Logged In (Session Refresh)

### Plain English

Your wristband (JWT) is only valid for 1 hour. But you don't want to log in every hour! So every time you navigate to a page, our server silently checks: "is this wristband about to expire?" If yes, it automatically gets you a fresh one without you ever noticing. As long as you use the app at least once per session, you stay logged in indefinitely.

### How It Works

```
Every page navigation:
           │
           ▼
Next.js Middleware runs (src/lib/supabase/middleware.ts)
           │
           ▼
Creates a Supabase server client with the request cookies
           │
           ▼
Calls: supabase.auth.getUser()
  → If JWT is valid and not expired: returns user, passes cookies through
  → If JWT is expired but refresh token is valid:
       Supabase issues a new JWT
       New cookies are written to the response (setAll() callback)
       Old expired token is replaced transparently
  → If both are expired/invalid: returns null
           │
           ▼
Middleware receives: { response (with possibly updated cookies), user }
  → user exists: continue to the requested page
  → user is null: redirect to /auth/login
```

### Token Rotation Security

When the refresh token is used, it is **immediately invalidated** and a new one is issued. This means:
- If an attacker steals your refresh token and uses it, the server issues a new one — but now the attacker has the new one and your old one is dead
- Next time YOU try to refresh, your token is invalid → you get logged out
- This signals that your session was compromised

The 10-second **reuse interval** (`refresh_token_reuse_interval = 10`) handles the edge case of multiple browser tabs all trying to refresh simultaneously — within a 10-second window, the same refresh token can be used again to prevent false logouts from concurrent tab activity.

---

## 9. Flow 5 — Route Protection (Middleware)

### Plain English

Think of the middleware as a security guard stationed at the entrance to every room. Before you can enter any page, the guard checks your wristband. Some rooms are private (your dashboard, your birth chart, your settings). Some rooms are for guests only (the login page). The guard enforces these rules on EVERY visit, every time, no exceptions.

### Protected Routes

```
PROTECTED — require a valid session:
  /today          → your daily horoscope
  /advisors       → advisor chat
  /features       → tarot, palm, magic ball, etc.
  /compatibility  → compatibility reports
  /birth-chart    → birth chart
  /settings       → account settings
  /auth/set-password    → can only be reached after email verification
  /auth/reset-password  → can only be reached after password reset email

GUEST-ONLY — redirect authenticated users away:
  /auth/login
  /auth/signup
  /auth/forgot-password
  (An already-logged-in user visiting these gets sent to /today)

PUBLIC — no check:
  /api/*            → API routes (each handles its own auth if needed)
  Static files      → images, fonts, CSS, JS
  /auth/callback    → handles email link tokens (must be public to work)
  /auth/confirm     → same reason
```

### Middleware Decision Tree

```
Request arrives at any URL
         │
         ├── Is it /api/* or a static file? → Pass through, no auth check
         │
         ├── Is Supabase not configured (no env vars)?
         │     └── Protected/password pages → redirect to login with error message
         │         Everything else → pass through
         │
         ├── Call refreshAuthSession() → get user (or null)
         │     └── If this throws (Supabase down):
         │           Protected pages → redirect to login with "Auth unavailable" message
         │           Everything else → pass through
         │
         ├── Is the page protected AND user is null?
         │     └── redirect to /auth/login?next=<original-path>
         │
         ├── Is the user logged in AND visiting a guest-only page?
         │     └── redirect to /today (or ?next= path if present)
         │
         └── Everything else → serve the page with updated session cookies
```

---

## 10. Flow 6 — Forgot Password

### Plain English

If you forget your password, you enter your email and we send you a secure reset link. That link is only valid once and expires after 1 hour. Clicking it proves you own the email, signs you in temporarily, and takes you to a screen where you choose a new password.

### Step-by-Step

```
1. User clicks "Forgot password?" → goes to /auth/forgot-password
           │
           ▼
2. User enters email address
           │
           ▼
3. Browser → POST /api/auth/forgot-password
   { email: "user@example.com", next: "/today" }
           │
           ▼
4. Server builds redirect URL:
   "https://app.com/auth/callback?intent=recovery&next=/today"
           │
           ▼
5. Server calls: supabase.auth.resetPasswordForEmail(email, { redirectTo })
   → Supabase sends a password reset email with a one-time link
   → Server ALWAYS returns { ok: true, message: "Reset link sent..." }
     (Even if the email isn't registered — prevents email enumeration)
           │
           ▼
6. User receives email, clicks link
   → Same callback flow as sign-up verification (Flow 2)
   → intent=recovery → redirected to /auth/reset-password
           │
           ▼
7. User sets new password (min 8 chars) on /auth/reset-password
           │
           ▼
8. Browser → POST /api/auth/update-password { password }
   Server confirms user is authenticated, updates password
           │
           ▼
9. User redirected to /today — logged in with new password
```

---

## 11. Flow 7 — Log Out

### Plain English

Logging out removes your wristband. The server tells Supabase to invalidate your session, clears the auth cookies from your browser, and wipes any cached data from memory. Even if you press the back button after logging out, you'll be sent to the login page.

### Step-by-Step

```
1. User clicks "Log out" in settings
           │
           ▼
2. Browser → POST /api/auth/logout
           │
           ▼
3. Server calls: supabase.auth.signOut()
   → Supabase invalidates the refresh token server-side
   → Response cookies: session cookies cleared (maxAge: 0)
           │
           ▼
   ┌── SUCCESS path ──────────────────────────────────────┐
   │ Server returns { ok: true }                          │
   │ Browser receives response with cleared cookies       │
   └──────────────────────────────────────────────────────┘
           │
           OR (Supabase outage scenario)
           │
   ┌── FAILURE FALLBACK path ─────────────────────────────┐
   │ signOut() throws (Supabase unreachable)              │
   │ Server iterates ALL request cookies                  │
   │ Any cookie starting with "sb-" is force-deleted      │
   │   by returning Set-Cookie: sb-*; maxAge=0            │
   │ Server still returns { ok: true }                    │
   │ (Client can always successfully log out,             │
   │  even during a Supabase outage)                      │
   └──────────────────────────────────────────────────────┘
           │
           ▼
4. Client side (settings-page.tsx):
   - queryClient.clear() — wipes ALL cached user data from memory
     (profile, billing, horoscope, advisor data — everything)
   - router.replace('/auth/login') — navigate to login page
   - router.refresh() — tells Next.js to re-render server components
           │
           ▼
5. Middleware on /auth/login sees: no valid session cookie
   → Serves the login page (no redirect back to app)
           │
           ▼
6. User is fully logged out.
   If they press Back, middleware catches the protected route
   and sends them back to login.
```

---

## 12. Security Features Baked In

### Anti-Enumeration

Both signup and forgot-password endpoints return the **same success message** regardless of whether an email address exists in the system. An attacker cannot probe which emails are registered by looking at the response.

```
POST /api/auth/magic-link { email: "new@user.com" }
→ { ok: true, message: "If this email is eligible..." }

POST /api/auth/magic-link { email: "existing@user.com" }
→ { ok: true, message: "If this email is eligible..." }
```

### Token Security

| Threat | Defense |
|--------|---------|
| XSS stealing session token | HTTP-only cookies: JavaScript cannot read them |
| CSRF attack (cross-site form submit) | Cookies have SameSite attribute; JSON-only endpoints reject form-encoded bodies |
| Session theft | Refresh token rotation: stolen tokens become invalid after one use |
| Brute force login | Supabase rate limiting: 30 sign-in attempts per 5 minutes per IP |
| Expired link reuse | One-time OTP tokens: Supabase invalidates after first use |
| Token in browser history | URL hash (`#access_token=...`) cleared via `window.history.replaceState` immediately after parsing |
| Open redirect via ?next= | `normalizeNextPath()` enforces: must start with `/`, cannot start with `/auth` |
| Weak passwords | Enforced at both API layer (Zod: min 8 chars) and Supabase config (min 8 chars) |
| Password change without auth | `secure_password_change = true`: current session required to change password |

### Open Redirect Prevention (in detail)

```
normalizeNextPath(input):
  "/today"          → "/today"       ✅ allowed
  "/birth-chart"    → "/birth-chart" ✅ allowed
  "/auth/login"     → "/today"       🔒 blocked (no auth loops)
  ""                → "/today"       🔒 blocked (empty)
  "http://evil.com" → "/today"       🔒 blocked (doesn't start with /)
  "//evil.com"      → "/today"       🔒 blocked (starts with //)
  null              → "/today"       🔒 blocked
```

---

## 13. Key Files Reference

| File | Role |
|------|------|
| `middleware.ts` | Entry guard — runs on every request, checks session, enforces redirects |
| `src/lib/supabase/middleware.ts` | `refreshAuthSession()` — validates + refreshes JWT, returns user |
| `src/lib/supabase/server.ts` | `getServerSupabaseClient()` — server-side Supabase client (API routes, Server Components) |
| `src/lib/supabase/client.ts` | `getBrowserSupabaseClient()` — browser-side Supabase client (singleton) |
| `src/lib/supabase/env.ts` | Reads and validates Supabase environment variables |
| `src/lib/auth/flow.ts` | Shared utilities: `normalizeNextPath`, `VALID_OTP_TYPES`, `buildAuthRedirectUrl` |
| `src/app/api/auth/login/route.ts` | POST endpoint: email + password login |
| `src/app/api/auth/logout/route.ts` | POST endpoint: signs out, force-clears cookies even on Supabase failure |
| `src/app/api/auth/magic-link/route.ts` | POST endpoint: signs up new user, sends verification email |
| `src/app/api/auth/forgot-password/route.ts` | POST endpoint: sends password reset email |
| `src/app/api/auth/update-password/route.ts` | POST endpoint: updates password (requires active session) |
| `src/app/auth/callback/page.tsx` | Client-side: handles all 3 email token formats, routes to set/reset password |
| `src/app/auth/confirm/route.ts` | Server-side: fallback callback for Supabase default email templates |
| `src/app/auth/login/page.tsx` | Login page — `MagicLinkForm` in login mode |
| `src/app/auth/signup/page.tsx` | Signup page — `MagicLinkForm` in signup mode |
| `src/app/auth/set-password/page.tsx` | Set password after email verification (new accounts) |
| `src/app/auth/reset-password/page.tsx` | Reset password after forgot-password email |
| `src/app/auth/forgot-password/page.tsx` | Forgot password page — email entry |
| `src/components/auth/magic-link-form.tsx` | Shared form component for login + signup |
| `src/components/auth/password-update-form.tsx` | Shared form component for set + reset password |
| `src/components/auth/forgot-password-form.tsx` | Forgot password form |
| `src/components/settings/settings-page.tsx` | Contains logout handler with cache clearing |

---

## 14. Edge Case Scenarios & Confirmation Tests

Each scenario below describes what happens in a non-standard situation — either something going wrong, or a user doing something unexpected.

---

### Edge Case 1: User signs up with an email that already has an account

**What the user does:** Goes to /auth/signup and enters an email that is already registered.

**What happens:**
```
1. POST /api/auth/magic-link is called
2. supabase.auth.signUp() is called with the email
3. Supabase returns the user BUT with identities: [] (no new identity created)
4. Code detects: identities.length === 0 → this is an existing account
5. supabase.auth.resend({ type: 'signup', email }) is called
   → Sends a new verification email (useful if original expired)
6. UI shows EXACT same success message as a new signup
```

**Why this matters:** An attacker cannot discover which emails are registered. The response is identical. The existing user receives a new verification email but nothing harmful happens.

---

### Edge Case 2: User clicks an expired email verification link

**What the user does:** Received a verification email, waited more than 1 hour (OTP expiry), then clicked the link.

**What happens:**
```
1. Browser opens /auth/callback with token_hash and type params
2. supabase.auth.verifyOtp({ token_hash, type }) is called
3. Supabase rejects it: "Token has expired or is invalid"
4. Callback catches the error
5. router.replace('/auth/login?next=/today&error=Email+link+is+invalid+or+has+expired...')
6. Login page shows the error message
7. User can click "Create account" to get a new verification email
```

**Confirmation:** No session is created. No partial auth state. User must request a new link.

---

### Edge Case 3: User tries to brute-force login

**What the attacker does:** Repeatedly submits wrong passwords to /api/auth/login.

**What happens:**
```
After 30 attempts within 5 minutes from the same IP:
→ Supabase rate limiting kicks in
→ Returns "Too many requests"
→ Server returns { ok: false, error: "Too many requests" } (HTTP 401)
→ UI shows error message
→ Further attempts from same IP are blocked for 5 minutes
```

**Confirmation:** The client-side form has `setSubmitting(true)` which disables the button during a request, preventing rapid-fire clicks. Server-side, Supabase enforces the rate limit.

---

### Edge Case 4: User directly navigates to /today without logging in

**What happens:**
```
1. Request for /today arrives at Next.js middleware
2. middleware.ts: isProtectedPath("/today") → true
3. refreshAuthSession() is called → user is null (no cookies)
4. Condition: isProtectedPath && !user → redirect
5. Response: 307 redirect to /auth/login?next=/today
6. User sees the login page
7. After logging in, router.replace("/today") takes them back
```

**Confirmation:** No app content is ever rendered to an unauthenticated user. The redirect happens BEFORE the page component even starts rendering.

---

### Edge Case 5: User opens the app in a new tab after their JWT expires (but refresh token is still valid)

**Plain English:** Your 1-hour pass ran out but you were away from the computer. You come back and open a new tab.

**What happens:**
```
1. Request arrives at middleware
2. refreshAuthSession() is called with the expired JWT cookie
3. @supabase/ssr detects the JWT is expired
4. Supabase uses the refresh token to issue a new JWT
5. setAll() callback sets the new JWT as a fresh cookie
6. Response includes the new cookie headers
7. User sees the page normally — they never knew anything happened
```

**Confirmation:** The user stays logged in seamlessly. The new JWT is valid for another 1 hour, and the refresh token is rotated (old one is now invalid).

---

### Edge Case 6: User is logged in on two browser tabs and logs out on one

**What happens:**
```
Tab A: User clicks logout
  → Supabase session invalidated server-side
  → Auth cookies cleared from browser (shared across tabs)
  → Tab A navigates to /auth/login

Tab B: User tries to navigate (click a link)
  → New request sent WITH the now-cleared cookies
  → Middleware: refreshAuthSession() → user is null
  → Redirect to /auth/login?next=<their intended destination>
  → Tab B is now also on the login page
```

**Confirmation:** Logout propagates to all tabs on the next navigation event. Tabs don't auto-redirect (that would require a WebSocket), but the next click in any tab will trigger the auth check.

---

### Edge Case 7: Supabase is completely down during login

**What happens:**
```
1. User submits login form
2. POST /api/auth/login calls supabase.auth.signInWithPassword()
3. Supabase returns a network error / 503
4. The error is caught in the route handler's catch block
5. Server returns { ok: false, error: "..." } (HTTP 400)
6. astroFetchJson throws → form's catch block runs
7. UI shows: "Unable to sign in." (or Supabase's error message)
8. User can try again once Supabase recovers
```

**Confirmation:** No session is created, no cookies are set. The user sees an error. Nothing is broken or left in an inconsistent state.

---

### Edge Case 8: Supabase is completely down during logout

**What happens:**
```
1. User clicks logout
2. POST /api/auth/logout → supabase.auth.signOut() throws
3. Catch block executes the FALLBACK path:
   - Iterates ALL request cookies
   - For every cookie starting with "sb-":
     → response.cookies.set(name, "", { maxAge: 0, path: "/" })
   → These are the Supabase auth session cookies
4. Response still returns { ok: true }
5. Client:
   - queryClient.clear() → all user data wiped from memory
   - router.replace('/auth/login')
6. Browser receives the response WITH the expired/cleared cookies
7. Auth cookies are now gone from the browser
8. Next request to /today: no cookies → middleware redirects to login
```

**Confirmation:** Users can ALWAYS log out, even during a complete Supabase outage. The fallback cookie clearing guarantees this.

---

### Edge Case 9: User manually navigates to /auth/set-password without going through email verification

**What happens:**
```
Scenario A — User has NO active session:
  → Middleware: isPasswordFlowPath("/auth/set-password") → true, user is null
  → Redirect to /auth/login?next=/auth/set-password
  → After login, normalizeNextPath converts /auth/... to /today
  → User never reaches set-password without a session

Scenario B — User has an active session (logged in normally):
  → Middleware allows access
  → User can set/change their password (this is valid behavior)
  → /api/auth/update-password confirms the user is authenticated
  → Password is updated
```

**Confirmation:** The page is inaccessible without authentication. An active session is required. Direct URL access by an unauthenticated user is impossible.

---

### Edge Case 10: User double-clicks the signup button (form submitted twice)

**What happens:**
```
Click 1: setSubmitting(true) → button disabled → request sent to /api/auth/magic-link
Click 2: button is disabled (submitting === true) → click is ignored
  → Only ONE request reaches the server
  → supabase.auth.signUp() called once
  → One verification email sent
```

**Confirmation:** The `submitting` state in the React form component prevents double submission entirely at the client level. Even if both requests somehow reached the server simultaneously, Supabase's email uniqueness constraint ensures consistent behavior.

---

### Edge Case 11: User switches accounts on the same device (Account A → Logout → Login as Account B)

**What happens:**
```
1. User is logged in as Account A
   → TanStack Query cache contains: A's profile, A's horoscope, A's billing data

2. User logs out:
   → queryClient.clear() is called → ALL cached data wiped
   → Auth cookies cleared
   → Redirected to /auth/login

3. User logs in as Account B:
   → queryClient.clear() is called again (on login success) → ensures no residual data
   → Account B's cookies are set
   → Navigated to /today
   → TanStack Query starts fresh fetches for Account B's data

4. Account B sees ONLY their own data.
   Account A's data is never visible.
```

**Confirmation:** Both logout AND login clear the TanStack Query cache. There is no scenario where Account A's data leaks to Account B's view.

---

### Edge Case 12: Forgot password link clicked after password was already reset

**What happens:**
```
1. User requests password reset
2. Email arrives with one-time token_hash
3. User resets password (token_hash consumed by Supabase)
4. User loses the email, finds it later, clicks the link again
5. /auth/callback → supabase.auth.verifyOtp({ token_hash, type: 'recovery' })
6. Supabase rejects it: "Token has expired or is invalid" (already used)
7. Callback → redirect to /auth/login with error message
8. User must request a new reset link if needed
```

**Confirmation:** OTP tokens are single-use. Clicking a used reset link does nothing and creates no session.

---

### Edge Case 13: JWT cookie tampered with in the browser's DevTools

**What happens:**
```
1. User opens DevTools → Application → Cookies
   (Note: HTTP-only cookies are NOT visible here — they are hidden from JavaScript)
   (User can see non-HTTP-only cookies but not the auth token)

2. If a user somehow modifies a non-HTTP-only cookie:
   → refreshAuthSession() is called
   → supabase.auth.getUser() sends the (tampered) JWT to Supabase
   → Supabase's signature verification fails
   → Returns: user = null
   → Middleware: protected route → redirect to login
```

**Confirmation:** JWTs are cryptographically signed by Supabase's private key. Any modification to the token payload invalidates the signature. The auth cookie itself is HTTP-only and cannot be read or modified by JavaScript.

---

### Edge Case 14: Network drops mid-login (request sent but response never received)

**What happens:**
```
1. User clicks Login → POST /api/auth/login sent
2. Network drops → browser timeout or connection refused error
3. astroFetchJson throws (fetch throws on network error)
4. Form's catch block: setErrorMessage("Authentication request failed.")
5. setSubmitting(false) (via finally) → button re-enabled

Question: Did the server actually log the user in?
→ Possibly, if the request reached Supabase before the network dropped
→ But the auth cookies were in the RESPONSE that the browser never received
→ So the browser has NO session cookies
→ User remains unauthenticated

The user just needs to try again. No stuck state. No partial login.
```

**Confirmation:** Because sessions are delivered via response cookies (not via a separate channel), a lost response = a lost session. The user's next login attempt is a clean start.

---

*Document last updated: 2026-03-20*
*Auth system version: Supabase @supabase/ssr v0.5.x + Next.js 16 App Router*
