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

export async function processJobEmail(params: {
  userId: string;
  gmailMessageId: string;
  subject: string;
  sender: string;
  snippet: string;
  receivedAt: string;
}) {
  const admin = createAdminClient();
  const { userId, gmailMessageId, subject, sender, snippet, receivedAt } = params;

  const { data: existing } = await admin
    .from("email_events")
    .select("id")
    .eq("gmail_message_id", gmailMessageId)
    .maybeSingle();
  if (existing) return { status: "already_processed" as const };

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
          user_id: userId,
          company_name: extracted.company_name,
          job_title: extracted.job_title ?? "Unknown role",
          source: "gmail",
          medium: extracted.source ?? "other",
          status: "applied",
          applied_at: receivedAt,
          needs_review: !extracted.job_title,
        })
        .select("id")
        .single();
      applicationId = inserted?.id ?? null;
    } else {
      const { data: match } = await admin
        .from("applications")
        .select("id, status")
        .eq("user_id", userId)
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
          changed_by: "gmail_sync",
        });
      } else {
        // No prior "applied" entry exists for this company — this email is our first
        // signal of this application's existence (e.g. applied directly by email and the
        // first trace we see is the interview/offer itself). Create the row now instead
        // of silently dropping it; flag for review since we're inferring backwards.
        const inferredStatus =
          extracted.classified_type === "offer" ? "offer" :
          extracted.classified_type === "rejection" ? "rejected" :
          extracted.classified_type === "interview" ? "interview" : "applied";

        const { data: inserted } = await admin
          .from("applications")
          .insert({
            user_id: userId,
            company_name: extracted.company_name,
            job_title: extracted.job_title ?? "Unknown role",
            source: "gmail",
            medium: extracted.source ?? "other",
            status: inferredStatus,
            applied_at: receivedAt,
            needs_review: true,
          })
          .select("id")
          .single();
        applicationId = inserted?.id ?? null;
      }
    }
  }

  await admin.from("email_events").insert({
    user_id: userId,
    application_id: applicationId,
    gmail_message_id: gmailMessageId,
    subject,
    sender,
    received_at: receivedAt,
    classified_type: extracted.classified_type,
    raw_snippet: snippet,
    processed_at: new Date().toISOString(),
  });

  return { status: "processed" as const, classified_type: extracted.classified_type, application_id: applicationId };
}
