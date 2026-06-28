import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groqJSON } from "@/lib/groq";
import { getCompanyContext } from "@/lib/tavily";

type TailorRequestBody = {
  cvText: string;
  jobDescription: string;
  companyName: string;
  location?: string;
};

type DiffItem = {
  id: string;
  section: string;
  original_bullet: string;
  suggested_bullet: string;
};

type GroqDiffResponse = {
  diffs: Omit<DiffItem, "id">[];
};

const SYSTEM_PROMPT = `You are an expert resume writer and career coach. You rewrite resume bullet points to better match a specific job description, while staying 100% truthful to the candidate's actual experience — never invent skills, employers, titles, or achievements that aren't implied by the original bullet.

Respond ONLY with a JSON object in this exact shape, and nothing else (no markdown, no preamble, no explanation):
{
  "diffs": [
    {
      "section": "string — short label for where this bullet lives, e.g. 'Experience – Acme Corp' or 'Skills'",
      "original_bullet": "string — copied EXACTLY, verbatim, character-for-character from the candidate's CV text, including any leading dash/bullet character it has",
      "suggested_bullet": "string — your rewritten version of that bullet"
    }
  ]
}

Rules:
- Only include bullets worth changing — skip bullets that are already strong and well-aligned. Do not pad the output with unnecessary changes.
- "original_bullet" MUST be an exact substring of the CV text provided, copied character-for-character. If you paraphrase or alter it even slightly it cannot be matched later and will be discarded.
- Focus on experience/achievement bullet points, not contact info, headers, or section titles.
- Weave in relevant company context (market trends, values, recent news) naturally where it strengthens alignment with the job — don't force it into every bullet, and don't fabricate company facts beyond what's given.
- Keep each suggested bullet roughly the same length as the original — resumes are space-constrained, this is a tailoring pass, not a rewrite.
- Aim for 4 to 10 total diffs depending on how much of the CV is genuinely relevant to improve. Never return more than 12.`;

/**
 * Finds `needle` inside `haystack` even if whitespace differs (extra/missing spaces,
 * different line breaks — common after PDF/DOCX text extraction, and something an LLM
 * echoing text back will often normalize slightly). Returns the ACTUAL matching
 * substring from `haystack` so later exact-string replacement still works, or null
 * if no reasonable match is found.
 */
function findFlexibleMatch(haystack: string, needle: string): string | null {
  const trimmedNeedle = needle.trim();
  if (!trimmedNeedle) return null;

  // Fast path: exact match.
  if (haystack.includes(trimmedNeedle)) return trimmedNeedle;

  // Build a regex from the needle that tolerates any amount of whitespace
  // (including newlines) wherever the needle itself has whitespace.
  const escaped = trimmedNeedle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const flexiblePattern = escaped.replace(/\s+/g, "\\s+");

  try {
    const regex = new RegExp(flexiblePattern);
    const match = haystack.match(regex);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: TailorRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const cvText = body.cvText?.trim() ?? "";
  const jobDescription = body.jobDescription?.trim() ?? "";
  const companyName = body.companyName?.trim() ?? "";
  const location = body.location?.trim() ?? "";

  if (!cvText || !jobDescription) {
    return NextResponse.json({ error: "CV text and job description are both required." }, { status: 400 });
  }

  // Best-effort company research — proceeds without it if Tavily fails or is unavailable.
  const companyContext = companyName ? await getCompanyContext(companyName, location) : "";

  const userPrompt = `CANDIDATE'S CURRENT CV TEXT:
"""
${cvText}
"""

TARGET JOB DESCRIPTION:
"""
${jobDescription}
"""

TARGET COMPANY: ${companyName || "(not specified)"}

COMPANY CONTEXT (recent news / market trends / values, from web research — may be empty if unavailable):
"""
${companyContext || "(no additional company context available)"}
"""

Rewrite the most relevant bullet points from the CV to align with the job description and company context, following the rules in your system prompt.`;

  try {
    const result = await groqJSON<GroqDiffResponse>(SYSTEM_PROMPT, userPrompt);

    const rawDiffs = result.diffs ?? [];
    const diffs: DiffItem[] = [];

    for (let i = 0; i < rawDiffs.length; i++) {
      const d = rawDiffs[i];
      if (!d.original_bullet || !d.suggested_bullet) continue;

      const matchedSubstring = findFlexibleMatch(cvText, d.original_bullet);
      if (!matchedSubstring) continue;

      // Use the ACTUAL text found in the CV (not Groq's possibly-reformatted echo of it)
      // so the front-end's exact-string replace works reliably later.
      diffs.push({
        id: `diff-${diffs.length}`,
        section: d.section,
        original_bullet: matchedSubstring,
        suggested_bullet: d.suggested_bullet,
      });
    }

    console.log(`CV tailor: Groq returned ${rawDiffs.length} diffs, ${diffs.length} matched against the CV text.`);

    return NextResponse.json({ diffs, hadCompanyContext: Boolean(companyContext) });
  } catch (err) {
    console.error("CV tailor error:", err);
    return NextResponse.json({ error: "Failed to generate tailored suggestions. Please try again." }, { status: 500 });
  }
}