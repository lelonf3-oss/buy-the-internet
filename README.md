# BUY THE INTERNET

A single public auction for the entire homepage takeover. The highest bidder gets 24 hours of full-page branding after paying via Stripe.

## Quick Start

1. `npm install`
2. Create D1 database: `npx wrangler d1 create buy-the-internet-db`
3. Copy the `database_id` into `wrangler.toml`
4. Apply migration: `npx wrangler d1 migrations apply buy-the-internet-db --remote`
5. Set environment variables in Cloudflare Pages (see main guide)
6. Deploy: `npx wrangler pages deploy public`

## Environment Variables (Cloudflare Pages → Settings → Environment Variables)

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `SITE_URL` | Your deployed URL, e.g. `https://auction.makertoolshub.com` |
| `ADMIN_TOKEN` | A long random string for admin API access |
| `JWT_SECRET` | A long random string for editor tokens |

## Stripe Webhook

Endpoint URL: `https://your-domain.com/api/stripe-webhook`  
Events: `checkout.session.completed`