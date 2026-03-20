# Going Live: Sandbox → Production Checklist

> This guide covers everything needed to move AstroAI billing from Stripe sandbox (test mode) to the live Stripe account. Follow it top to bottom exactly once. Estimated time: **30–45 minutes**.

---

## Before You Start

Make sure you have:
- [ ] Access to the Stripe Dashboard live account (not sandbox)
- [ ] Access to your production server / hosting platform (Vercel, Railway, etc.)
- [ ] The Supabase production project URL and service role key
- [ ] The Stripe CLI installed (`stripe --version` to confirm)

> **Do NOT rush this.** Going live means real money. Take your time on each step.

---

## Step 1 — Get Your Live Stripe Keys

1. Open Stripe Dashboard → make sure you're in **Live mode** (toggle at top-left, switch from "Sandbox" to "Live")
2. Go to **Developers → API keys**
3. Copy both keys into a secure notes app (not email):
   - **Publishable key:** `pk_live_...`
   - **Secret key:** `sk_live_...` (click "Reveal" to see it)

> **Never commit these to git.** They go only in environment variables on your server.

---

## Step 2 — Create Products in Stripe Live Mode

Run the commands below **one block at a time** in your terminal. Replace `YOUR_LIVE_SECRET_KEY` with `sk_live_...` from Step 1.

### 2a. Create the AstroAI Pro product

```bash
curl -s -X POST https://api.stripe.com/v1/products \
  -u "YOUR_LIVE_SECRET_KEY:" \
  --data-urlencode "name=AstroAI Pro" \
  --data-urlencode "description=Full personalized horoscope, complete birth chart, palm reading, soulmate, and deep compatibility" \
  -d "metadata[product]=astroai_pro"
```

**Save the `id` from the response** — it looks like `prod_XXXXXXXXXXXX`. You need it in the next step.

### 2b. Create the 3 Pro subscription prices

Replace `PROD_ID` with the ID from 2a.

```bash
# Weekly — $6.99
curl -s -X POST https://api.stripe.com/v1/prices \
  -u "YOUR_LIVE_SECRET_KEY:" \
  -d "product=PROD_ID" \
  -d "unit_amount=699" \
  -d "currency=usd" \
  -d "recurring[interval]=week" \
  -d "lookup_key=astroai_pro_weekly_usd" \
  -d "transfer_lookup_key=true" \
  -d "nickname=Pro Weekly"

# Monthly — $19.99
curl -s -X POST https://api.stripe.com/v1/prices \
  -u "YOUR_LIVE_SECRET_KEY:" \
  -d "product=PROD_ID" \
  -d "unit_amount=1999" \
  -d "currency=usd" \
  -d "recurring[interval]=month" \
  -d "lookup_key=astroai_pro_monthly_usd" \
  -d "transfer_lookup_key=true" \
  -d "nickname=Pro Monthly"

# Yearly — $99.00
curl -s -X POST https://api.stripe.com/v1/prices \
  -u "YOUR_LIVE_SECRET_KEY:" \
  -d "product=PROD_ID" \
  -d "unit_amount=9900" \
  -d "currency=usd" \
  -d "recurring[interval]=year" \
  -d "lookup_key=astroai_pro_yearly_usd" \
  -d "transfer_lookup_key=true" \
  -d "nickname=Pro Yearly"
```

Each response has an `"id": "price_..."`. Save all three.

### 2c. Create the 3 credit pack products + prices

```bash
# Credits 50 — $9.99
curl -s -X POST https://api.stripe.com/v1/products \
  -u "YOUR_LIVE_SECRET_KEY:" \
  --data-urlencode "name=AstroAI Credits - 50" \
  --data-urlencode "description=50 advisor chat credits" \
  -d "metadata[product]=astroai_credits_50"
# → save product id as CREDITS_50_PROD

curl -s -X POST https://api.stripe.com/v1/prices \
  -u "YOUR_LIVE_SECRET_KEY:" \
  -d "product=CREDITS_50_PROD" \
  -d "unit_amount=999" \
  -d "currency=usd" \
  -d "lookup_key=astroai_credits_50_usd" \
  -d "transfer_lookup_key=true" \
  -d "nickname=Credits 50"

# Credits 100 — $19.99
curl -s -X POST https://api.stripe.com/v1/products \
  -u "YOUR_LIVE_SECRET_KEY:" \
  --data-urlencode "name=AstroAI Credits - 100" \
  --data-urlencode "description=100 advisor chat credits" \
  -d "metadata[product]=astroai_credits_100"
# → save product id as CREDITS_100_PROD

curl -s -X POST https://api.stripe.com/v1/prices \
  -u "YOUR_LIVE_SECRET_KEY:" \
  -d "product=CREDITS_100_PROD" \
  -d "unit_amount=1999" \
  -d "currency=usd" \
  -d "lookup_key=astroai_credits_100_usd" \
  -d "transfer_lookup_key=true" \
  -d "nickname=Credits 100"

# Credits 200 — $29.99
curl -s -X POST https://api.stripe.com/v1/products \
  -u "YOUR_LIVE_SECRET_KEY:" \
  --data-urlencode "name=AstroAI Credits - 200" \
  --data-urlencode "description=200 advisor chat credits - Best Value" \
  -d "metadata[product]=astroai_credits_200"
# → save product id as CREDITS_200_PROD

curl -s -X POST https://api.stripe.com/v1/prices \
  -u "YOUR_LIVE_SECRET_KEY:" \
  -d "product=CREDITS_200_PROD" \
  -d "unit_amount=2999" \
  -d "currency=usd" \
  -d "lookup_key=astroai_credits_200_usd" \
  -d "transfer_lookup_key=true" \
  -d "nickname=Credits 200"
```

> **Important:** You now have 6 live price IDs (3 Pro + 3 Credit packs). Keep them handy for Step 3.

---

## Step 3 — Update the Database with Live Price IDs

You have two options. Pick whichever is easier for you.

### Option A — Supabase Dashboard (no code needed)

1. Open Supabase Dashboard → your **production** project → Table Editor
2. Navigate to `billing` schema → `plan_price_versions` table
3. Filter by `currency = USD` and `is_active = true`
4. For each of the 6 rows, click the row and update `stripe_price_id` with the live price ID you got from Step 2:

| lookup_key | Replace stripe_price_id with |
|------------|------------------------------|
| `astroai_pro_weekly_usd` | `price_live_...` (weekly from 2b) |
| `astroai_pro_monthly_usd` | `price_live_...` (monthly from 2b) |
| `astroai_pro_yearly_usd` | `price_live_...` (yearly from 2b) |
| `astroai_credits_50_usd` | `price_live_...` (50 pack from 2c) |
| `astroai_credits_100_usd` | `price_live_...` (100 pack from 2c) |
| `astroai_credits_200_usd` | `price_live_...` (200 pack from 2c) |

### Option B — curl (faster, copy-paste)

Replace each `price_live_XXX` with your actual live price IDs.

```bash
SUPABASE_URL="https://YOUR_PRODUCTION_PROJECT.supabase.co"
SERVICE_KEY="YOUR_PRODUCTION_SERVICE_ROLE_KEY"

for row in \
  "astroai_pro_weekly_usd:price_live_WEEKLY" \
  "astroai_pro_monthly_usd:price_live_MONTHLY" \
  "astroai_pro_yearly_usd:price_live_YEARLY" \
  "astroai_credits_50_usd:price_live_CREDITS50" \
  "astroai_credits_100_usd:price_live_CREDITS100" \
  "astroai_credits_200_usd:price_live_CREDITS200"
do
  LOOKUP="${row%%:*}"
  PRICE_ID="${row##*:}"
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
    "${SUPABASE_URL}/rest/v1/plan_price_versions?lookup_key=eq.${LOOKUP}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{\"stripe_price_id\": \"${PRICE_ID}\"}")
  echo "${LOOKUP}: HTTP ${HTTP}"
done
```

Every line should print `HTTP 204`. If you see `HTTP 0` or `HTTP 4xx`, check your URL and service key.

---

## Step 4 — Set Up the Live Webhook

Stripe needs to know where to send payment events. For production, you register a permanent endpoint (unlike local dev where you use `stripe listen`).

### 4a. Register the webhook endpoint

```bash
curl -s -X POST https://api.stripe.com/v1/webhook_endpoints \
  -u "YOUR_LIVE_SECRET_KEY:" \
  -d "url=https://YOUR_PRODUCTION_DOMAIN.com/api/stripe/webhook" \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=customer.subscription.created" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted" \
  -d "enabled_events[]=invoice.payment_succeeded" \
  -d "enabled_events[]=invoice.payment_failed"
```

Replace `YOUR_PRODUCTION_DOMAIN.com` with your actual domain (e.g., `astroai.app`).

The response contains `"secret": "whsec_live_..."` — **copy this immediately**, it's only shown once.

### 4b. Save the webhook secret

Add it to your production environment:
```
STRIPE_WEBHOOK_SECRET=whsec_live_...
```

---

## Step 5 — Update Production Environment Variables

In your hosting platform (Vercel, Railway, etc.), set these environment variables for production:

```bash
STRIPE_SECRET_KEY=sk_live_...            # From Step 1
STRIPE_PUBLISHABLE_KEY=pk_live_...       # From Step 1
STRIPE_WEBHOOK_SECRET=whsec_live_...     # From Step 4b
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Everything else (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) stays the same if you're using the same Supabase project for production.

> **For Vercel:** Dashboard → Your project → Settings → Environment Variables → set scope to "Production" only (not Preview/Development).

---

## Step 6 — Deploy and Smoke Test

Deploy your app with the new environment variables, then run these tests manually:

### Test 1: Stripe keys are loaded
Open browser devtools on your live site. The pricing page should load without errors. If you see a Stripe error in the console, the publishable key is wrong.

### Test 2: Free plan gating works
1. Open a new incognito window
2. Sign up with a real email
3. Try to access a Pro feature (e.g., Full Birth Chart)
4. You should see the upgrade overlay — NOT the content

### Test 3: Checkout session creates
1. Click "Get Pro" on the pricing page
2. You should be redirected to a Stripe Checkout page
3. Stripe should show your product name and correct price
4. **DO NOT complete the payment yet** — just confirm the page looks right

### Test 4: Complete a test subscription (use a real card — this is live!)
Use a small plan (weekly $6.99) for this test. Complete checkout. Then:
- Confirm subscription appears in Stripe Dashboard → Customers
- Confirm the Pro features are now unlocked in the app
- Check Supabase → `billing.subscriptions` — should have a new `active` row

### Test 5: Webhook delivery
In Stripe Dashboard → Developers → Webhooks → click your endpoint → Events tab. After Step 4's test purchase, you should see `checkout.session.completed` and `customer.subscription.created` events with green checkmarks (200 response).

If events are failing (red), check your server logs. Common issues: wrong `STRIPE_WEBHOOK_SECRET`, or the `/api/stripe/webhook` route is returning an error.

### Test 6: Cancel and check downgrade
Cancel the test subscription from the customer portal (or from Stripe Dashboard). Confirm the app downgrades to Free after the period ends.

---

## Rollback Plan

If something goes wrong after going live:

### Stripe webhook failing
1. Go to Stripe Dashboard → Webhooks → your endpoint
2. Click "Disable endpoint" — this stops Stripe from sending events
3. Fix the issue in code, deploy, then re-enable

### Wrong price IDs in DB
1. Re-run Step 3 with the correct price IDs
2. No code deploy needed — the DB update takes effect immediately

### Downgrade users accidentally
If users lose Pro access due to a DB or caching issue:
1. The entitlement cache TTL is 5 minutes — most users will auto-recover
2. To force a specific user's cache to clear, find their `user_id` and run:
   ```
   revalidateTag(`sub:${userId}`, 'max')
   ```
   Or simply wait 5 minutes.

---

## Quick Reference — All Lookup Keys

These never change between sandbox and live. The app always looks up prices by lookup key, not by price ID. The only thing that changes when going live is the `stripe_price_id` values in the DB.

| Lookup key | Product | Amount |
|------------|---------|--------|
| `astroai_pro_weekly_usd` | Pro subscription | $6.99/week |
| `astroai_pro_monthly_usd` | Pro subscription | $19.99/month |
| `astroai_pro_yearly_usd` | Pro subscription | $99.00/year |
| `astroai_credits_50_usd` | Credit pack | $9.99 one-time |
| `astroai_credits_100_usd` | Credit pack | $19.99 one-time |
| `astroai_credits_200_usd` | Credit pack | $29.99 one-time |

---

## Sandbox Price IDs (for reference)

These are the test-mode price IDs already in your DB and Stripe sandbox. **Do not use these in production** — they only work in test mode.

| Lookup key | Sandbox price ID |
|------------|-----------------|
| `astroai_pro_weekly_usd` | `price_1TCzUZDgW4wAqiJswsbOGC75` |
| `astroai_pro_monthly_usd` | `price_1TCzUuDgW4wAqiJsnNeITlgn` |
| `astroai_pro_yearly_usd` | `price_1TCzVHDgW4wAqiJsNFRv3Vwk` |
| `astroai_credits_50_usd` | `price_1TCzXaDgW4wAqiJsvxLnl7yK` |
| `astroai_credits_100_usd` | `price_1TCzXeDgW4wAqiJsct9vdmti` |
| `astroai_credits_200_usd` | `price_1TCzXhDgW4wAqiJstmQis23b` |

---

## Summary Checklist

```
[ ] Step 1: Copied live sk_live_... and pk_live_... from Stripe Dashboard
[ ] Step 2a: Created "AstroAI Pro" product in live mode
[ ] Step 2b: Created 3 Pro subscription prices (weekly/monthly/yearly)
[ ] Step 2c: Created 3 credit pack products + prices (50/100/200)
[ ] Step 3: Updated billing.plan_price_versions with live price IDs (6 rows, all HTTP 204)
[ ] Step 4a: Registered webhook endpoint at /api/stripe/webhook
[ ] Step 4b: Saved whsec_live_... from webhook registration
[ ] Step 5: Set STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET in production env
[ ] Step 6: Deployed and ran smoke tests (all 6 tests passed)
```

You're live. 🎉
