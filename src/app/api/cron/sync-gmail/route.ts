import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAccessToken, listRecentMessages, getMessageMeta } from "@/lib/google";
import { processJobEmail } from "@/lib/email-processing";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, gmail_refresh_token, last_gmail_sync_at")
    .eq("gmail_connected", true);

  const results = [];

  for (const profile of profiles ?? []) {
    if (!profile.gmail_refresh_token) continue;

    try {
      const accessToken = await getAccessToken(profile.gmail_refresh_token);
      const since = profile.last_gmail_sync_at
        ? Math.floor(new Date(profile.last_gmail_sync_at).getTime() / 1000)
        : Math.floor(Date.now() / 1000) - 86400; // first run: look back 1 day

      const messageIds = await listRecentMessages(accessToken, since);

      for (const id of messageIds) {
        const meta = await getMessageMeta(accessToken, id);
        const result = await processJobEmail({
          userId: profile.id,
          gmailMessageId: meta.id,
          subject: meta.subject,
          sender: meta.sender,
          snippet: meta.snippet,
          receivedAt: new Date(Number(meta.internalDate)).toISOString(),
        });
        results.push({ user: profile.id, messageId: id, ...result });
      }

      await admin.from("profiles").update({ last_gmail_sync_at: new Date().toISOString() }).eq("id", profile.id);
    } catch (err) {
      console.error(`Gmail sync failed for user ${profile.id}:`, err);
      results.push({ user: profile.id, error: String(err) });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
