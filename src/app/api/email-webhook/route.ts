import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { groqJSON } from "@/lib/groq";

type ExtractedEmail = {
  is_job_related: boolean;
  classified_type: "application_confirmation" | "interview" | "offer" | "rejection" | "other";
  company_name: string | null;
  job_title: string | null;
  source: "linkedin" | "indeed" | "email" | "company_site" | "other" | null;
};

const SYSTEM_PROMPT = `You read job-application-related emails and extract structured data.
Return strict JSON matching this shape:
{
  "is_job_related": boolean,
  "classified_type": "application_confirmation" | "interview" | "offer" | "rejection" | "other",
  "company_name": string | null,
  "job_title": string | null,
  "source": "linkedin" | "indeed" | "email" | "company_site" | "other" | null
}
"source" means how the application was originally submitted, inferred from sender domain/content
(e.g. linkedin.com -> "linkedin", indeed.com -> "indeed", a company's own domain -> "company_site",
a generic recruiter/HR email with no platform -> "email").
If the email is not related to a job application at all, set is_job_related to false and other fields to null.
Be conservative: only extract a company_name/job_title if reasonably confident.`;

export async function POST(req: NextRequest) {
  // Shared-secret check so random people can't write to your table.
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.EMAIL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { gmail_message_id, subject, sender, snippet, received_at, user_email } = body as {
    gmail_message_id: string;
    subject: string;
    sender: string;
    snippet: string;
    received_at: string;
    user_email: string;
  };

  if (!gmail_message_id || !subject) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve which app user this email belongs to.
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", (await admin.auth.admin.listUsers()).data.users.find((u) => u.email === user_email)?.id ?? "")
    .single();

  if (!profile) {
    return NextResponse.json({ error: "unknown user" }, { status: 404 });
  }

  // Avoid double-processing the same email if Zapier retries.
  const { data: existing } = await admin
    .from("email_events")
    .select("id")
    .eq("gmail_message_id", gmail_message_id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ status: "already_processed" });
  }

  const extracted = await groqJSON<ExtractedEmail>(
    SYSTEM_PROMPT,
    `Subject: ${subject}\nFrom: ${sender}\nBody snippet: ${snippet}`
  );

  let applicationId: string | null = null;

  if (extracted.is_job_related && extracted.company_name) {
    if (extracted.classified_type === "application_confirmation") {
      const { data: inserted } = await admin
        .from("applications")
        .insert({
          user_id: profile.id,
          company_name: extracted.company_name,
          job_title: extracted.job_title ?? "Unknown role",
          source: extracted.source ?? "other",
          status: "applied",
          applied_at: received_at,
          needs_review: !extracted.job_title,
        })
        .select("id")
        .single();
      applicationId = inserted?.id ?? null;
    } else {
      // Interview / offer / rejection: try to match an existing application by company name
      // and log a status change instead of creating a duplicate row.
      const { data: match } = await admin
        .from("applications")
        .select("id, status")
        .eq("user_id", profile.id)
        .ilike("company_name", `%${extracted.company_name}%`)
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (match) {
        applicationId = match.id;
        const newStatus =
          extracted.classified_type === "offer" ? "offer" :
          extracted.classified_type === "rejection" ? "rejected" :
          extracted.classified_type === "interview" ? "interview" : match.status;

        await admin.from("applications").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", match.id);
        await admin.from("status_history").insert({
          application_id: match.id,
          old_status: match.status,
          new_status: newStatus,
          changed_by: "email_parser",
        });
      }
    }
  }

  await admin.from("email_events").insert({
    user_id: profile.id,
    application_id: applicationId,
    gmail_message_id,
    subject,
    sender,
    received_at,
    classified_type: extracted.classified_type,
    raw_snippet: snippet,
    processed_at: new Date().toISOString(),
  });

  return NextResponse.json({ status: "processed", classified_type: extracted.classified_type, application_id: applicationId });
}
