# Debug Logging

## Modes

- `npm run dev`
  Starts the app in normal local mode. Verbose flow tracing stays off.
- `npm run dev:logs`
  Starts the app with `ASTRO_DEBUG_LOGS=1` so backend request flow logs print in the terminal.

Verbose debug tracing is automatically disabled when `NODE_ENV=production`, even if `ASTRO_DEBUG_LOGS=1`.

## What Gets Logged

When debug mode is on, the backend prints structured logs for:

- API request start and finish
- request validation and failure reasons
- service method start and finish
- cache hit, miss, stale fallback, and save events
- provider and OpenAI calls with durations
- onboarding and palm-reading workflow checkpoints

Each request is tied together with:

- `traceId`
- `requestId`
- `scope`
- `event`
- `durationMs`
- safe metadata

Client-side fetch helpers add these headers to requests so the terminal shows which feature triggered the call:

- `x-astro-trace-id`
- `x-astro-debug-origin`

## Log Format

Example:

```text
[astro-debug] 2026-03-19T10:12:31.201Z INFO api.astro.today.GET request.start traceId=... requestId=...
```

The important fields are:

- `scope`: logger namespace, usually route/service/provider specific
- `event`: current step in the workflow
- `traceId`: cross-layer request trace
- `requestId`: per-request identifier on the server
- `durationMs`: elapsed time for timed steps
- `outcome`: success, error, fallback, or similar completion state

## Redaction

The logger sanitizes sensitive values before printing. It does not intentionally print:

- API keys
- auth tokens
- cookies
- passwords
- session secrets
- full base64 image payloads
- oversized prompt or request bodies

Instead it logs safe metadata such as lengths, IDs, counts, route params, and selected non-sensitive fields.

## Naming

Current conventions:

- route scopes: `api.<area>.<feature>.<METHOD>`
- service scopes: `server.<area>.<feature>` or module-specific scopes
- client origins: `hooks.<feature>...` or `components.<feature>...`
- event names: `request.start`, `request.validated`, `cache.hit`, `provider.success`, `pipeline.error`

Keep new log events workflow-oriented. Do not add noisy entry/exit logs for trivial helpers.
