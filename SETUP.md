# Baby Tracker — Setup Guide

## 1. Supabase

1. Go to your Supabase project dashboard
2. Open the **SQL Editor**
3. Paste and run the contents of `supabase/schema.sql`
4. Done — tables, RLS policies, and realtime are all configured

## 2. Environment

Copy your Supabase credentials into `.env.local`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Find these in: Supabase dashboard → Settings → API

## 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## 4. Install on phone (PWA)

After deploying (or via local network):
- **iPhone**: Open in Safari → Share → "Add to Home Screen"
- **Android**: Open in Chrome → menu → "Add to Home Screen" / "Install app"

## 5. Invite your partner

1. Sign in → choose "Create a new family"
2. Go to Settings (⚙️) → copy the 6-letter invite code
3. Your partner signs in → "Join with invite code" → enter it
4. You're synced!

## Deploy

```bash
npm run build
# Upload the dist/ folder to Vercel, Netlify, or any static host
```
