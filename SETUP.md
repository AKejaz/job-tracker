# Job Tracker — Setup Guide

Everything is built. You need to do 4 things, none of them coding.

## 1. Enable Realtime on the applications table (so dashboard updates live)

In Supabase SQL Editor, run:
```sql
alter publication supabase_realtime add table applications;
```

## 2. Deploy to Vercel (free)

1. Push this folder to a new GitHub repo (or use Vercel's "drag and drop folder" import).
2. Go to vercel.com → New Project → import the repo.
3. Add these Environment Variables in Vercel project settings (same values as your `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SECRET_KEY`
   - `GROQ_API_KEY`
   - `EMAIL_WEBHOOK_SECRET` — make up any random string, e.g. `jt_8f3k2m9x`
4. Deploy. You'll get a URL like `job-tracker-yourname.vercel.app`.

## 3. Supabase Auth redirect URL

In Supabase Dashboard → Authentication → URL Configuration, add your Vercel URL:
`https://job-tracker-yourname.vercel.app/auth/callback`

Then go to `/login` on your deployed site, enter your email, click the magic link. You're in.

## 4. Wire up Gmail → automatic logging (via Zapier, since you already have it connected)

Create a Zap:
- **Trigger:** Gmail → "New Email Matching Search". Search query: `is:unread (subject:(applied OR application OR thank you for applying OR interview OR offer))` — adjust to match what your confirmation emails actually look like.
- **Action:** Webhooks by Zapier → POST
  - URL: `https://your-vercel-url.vercel.app/api/email-webhook`
  - Headers: `x-webhook-secret: <the EMAIL_WEBHOOK_SECRET you set in step 2>`
  - Data (JSON):
    ```
    gmail_message_id: {{Message Id}}
    subject: {{Subject}}
    sender: {{From Email}}
    snippet: {{Body Plain}}
    received_at: {{Date}}
    user_email: aliejazkhan10@gmail.com
    ```

That's it. From here:
- Every matching email gets read by Groq, classified (application / interview / offer / rejection), and either creates a new row in your dashboard or updates an existing application's status.
- The dashboard updates instantly — no refresh — because of Supabase Realtime.
- The CV box on the dashboard lets you paste resume text and get Groq-suggested job titles for the Islamabad 2026 market.

## What's NOT built yet (next phase, tell me when ready)
- Chrome extension for LinkedIn/Indeed apply-click capture and company-site confirm-toast.
- Direct PDF upload for CV (currently paste-text only — works, just less slick).
- Trend/growth charts ("where you're seeing the most growth") — the data model supports it, just needs a charts component.

## Local development
```bash
npm install
npm run dev
```
Visit `http://localhost:3000`.
