# Cloudflare Deployment Guide

## Architecture (Updated)

- **Frontend**: Deployed to Cloudflare Pages (React + Vite static site)
- **Backend API**: Cloudflare Pages Functions (runs on Workers runtime)
- **Emails**: Sent via MailChannels API (free, integrated with Cloudflare, no API key needed)
- **Cache**: Cloudflare KV (optional) with in-memory fallback

No separate backend host needed — everything runs on Cloudflare.

## Prerequisites

1. Cloudflare account
2. Zoho Mail account with App-Specific Password (or any SMTP email account)
3. Node.js 18+ for building
4. Wrangler CLI: `npm install -g wrangler`

## Environment Variables

Set these in the Cloudflare Pages dashboard: **Settings → Environment variables**

| Variable | Description |
|---|---|
| `EMAIL_USER` | Your SMTP email address (e.g. `you@zohomail.com`) |
| `EMAIL_PASS` | SMTP password or App-Specific Password |
| `ADMIN_EMAIL` | Where order notifications go |
| `IMG_HOSTING_API_KEY` | imghosting.in API key for image uploads |
| `VITE_API_BASE_URL` | Leave empty (same-origin) |

## Deployment

### Option A: Via Cloudflare Dashboard (Recommended)

1. Push code to GitHub
2. Go to Cloudflare Pages → Create application → Connect to Git
3. Select your repository
4. Build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Add environment variables (see above)
6. Deploy

### Option B: Via Wrangler CLI

```bash
# Build the frontend
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist/ --branch production

# Or deploy to a preview
npx wrangler pages deploy dist/ --branch preview
```

## Email Sending

Emails are sent via the **MailChannels API** (`api.mailchannels.net`), which is:
- Free for Cloudflare users
- No API key required when sent from Cloudflare Workers/Pages Functions
- Supports SMTP credentials via environment variables

The MailChannels integration requires your domain's DNS to be managed by Cloudflare.

### Setting up Zoho Mail

1. Go to mail.zoho.com → Settings → Security → App Passwords
2. Generate a 16-character app-specific password
3. Set `EMAIL_USER=you@zohomail.com` and `EMAIL_PASS=<password>` in Pages env variables

## Cache

- **Frontend cache**: Uses `localStorage` (works in browser)
- **API cache**: Uses Cloudflare KV if `CACHE` binding is configured, otherwise in-memory
- To enable KV cache: Create a KV namespace in Cloudflare Dashboard and add the binding

## Testing

After deployment, visit:
```
https://your-app.pages.dev/api/cache-test
https://your-app.pages.dev/api/test-email?adminEmail=test@example.com
```

## Troubleshooting

### Emails not sending
1. Verify `EMAIL_USER` and `EMAIL_PASS` are set in Pages environment variables
2. Check your Zoho inbox for unblock prompts
3. Domain DNS must be proxied through Cloudflare (orange cloud)

### CORS errors
The Pages Functions set `Access-Control-Allow-Origin: *`. If needed, restrict in `functions/api/[[catchall]].js`.

### Build failures
Run locally: `npm install && npm run build` to verify.
