import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/google";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(`${origin}/dashboard?gmail_error=missing_code`);
  }

  const redirectUri = new URL("/api/auth/google/callback", req.url).toString();

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens.refresh_token) {
      // Happens if the user already granted consent before and Google doesn't resend it.
      // The "prompt: consent" param on /start should prevent this, but just in case:
      return NextResponse.redirect(`${origin}/dashboard?gmail_error=no_refresh_token`);
    }

    const admin = createAdminClient();
    await admin.from("profiles").upsert({
      id: userId,
      gmail_connected: true,
      gmail_refresh_token: tokens.refresh_token,
      last_gmail_sync_at: new Date().toISOString(),
    });

    return NextResponse.redirect(`${origin}/dashboard?gmail_connected=true`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(`${origin}/dashboard?gmail_error=exchange_failed`);
  }
}
