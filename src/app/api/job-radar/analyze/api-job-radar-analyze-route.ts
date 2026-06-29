import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groq, GROQ_MODEL } from "@/lib/groq";

// This route owns the Groq fit-analysis call exclusively, giving it its own ~10s
// Vercel Hobby execution budget instead of sharing one with the JSearch call that
// used to run in the same function in /api/job-radar/search/route.ts. That sharing
// was the root cause of the original reliability problem (504s killing the function
// mid-Groq-call, which produced the "1 cached result with a different random star
// rating each time" symptom from partial/failed JSON.parse).
export const maxDuration = 30;

type JSearchJob = {
  job_id: string;
  employer_name: string | null;
  job_title: string | null;
  job_apply_link: string | null;
  job_city: string | null;
  job_state: string | null;
  job_country: string | null;
  job_is_remote: boolean | null;
  job_employment_type: string | null;
  job_description: string | null;
  job_posted_at_datetime_utc: string | null;
};

type AnalyzeRequestBody = {
  jobs: JSearchJob[];
  cvText?: string;
};

type GroqAnalysis = {
  jobs: { index: number; why_fit: string; star_rating: number }[];
};

function locationLabel(job: JSearchJob): string {
  if (job.job_is_remote) return "Remote";
  return [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", ") || "—";
}

const ANALYSIS_SYSTEM_PROMPT = `You are a sharp, honest career-fit analyst. You will be given a numbered list of live job postings and (optionally) a candidate's CV text. For EVERY job in the list, you must return exactly one analysis object.

Respond ONLY with a JSON object in this exact shape, and nothing else (no markdown, no preamble):
{
  "jobs": [
    { "index": number, "why_fit": "string — one punchy sentence", "star_rating": number }
  ]
}

Rules:
- "index" must match the 0-based index of the job in the list provided — this is how your answer gets matched back, so never skip or reorder jobs.
- "why_fit" is ONE sentence, punchy and specific, explaining why this particular job is or isn't a good match. Reference something concrete from the job (title, seniority, skills implied) — avoid generic filler.
- "star_rating" is an integer 1-5 estimating the candidate's interview odds for that role (5 = excellent match, 1 = weak match).
- If no CV text was provided, base your rating on general role clarity and seniority signals only, keep "why_fit" honest about the lack of CV context (e.g. note what kind of background would fit), and avoid claiming a personalized match you can't support.
- Be accurate and consistent — do not inflate ratings to be encouraging. A genuinely weak fit should score 1-2.
- Never fabricate candidate experience not present in the CV text.`;

async function analyzeFit(jobs: JSearchJob[], cvText: string): Promise<GroqAnalysis> {
  const listing = jobs
    .map((j, i) => {
      // This route has its own ~10s budget with no competing JSearch call, so the
      // description excerpt can stay more generous than the 300-char trim that was
      // needed when both calls shared one function's time budget.
      const desc = (j.job_description ?? "").slice(0, 500);
      return `[${i}] Title: ${j.job_title ?? "Unknown"} | Company: ${j.employer_name ?? "Unknown"} | Location: ${locationLabel(j)} | Type: ${j.job_employment_type ?? "Unknown"}\nDescription excerpt: ${desc}`;
    })
    .join("\n\n");

  const userPrompt = `CANDIDATE CV TEXT (may be empty):
"""
${cvText ? cvText.slice(0, 6000) : "(none provided)"}
"""

JOB LISTINGS:
${listing}

Analyze every listing above and return the JSON object described in your system prompt.`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0,
    // Generous on purpose — this route no longer has to leave headroom for a
    // competing JSearch call, and a higher cap means the JSON response is never
    // truncated mid-object. Truncation was the actual cause of the inconsistent
    // star-rating symptom (JSON.parse throwing → silent fallback to a hardcoded 3).
    max_tokens: 4000,
    response_format: { type: "json_object" },
    // Asks Groq to sample as deterministically as it can, so the same job + same CV
    // text produces the same star rating across calls instead of drifting between
    // 2/3/4 on repeated attempts. Determinism isn't guaranteed by the API, but this
    // removes one source of the randomness reported.
    seed: 42,
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as GroqAnalysis;
  } catch {
    return { jobs: [] };
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: AnalyzeRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const jobs = body.jobs;
  const cvText = body.cvText?.trim() ?? "";

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return NextResponse.json({ error: "A non-empty jobs array is required." }, { status: 400 });
  }

  try {
    const analysis = await analyzeFit(jobs, cvText);
    return NextResponse.json({ jobs: analysis.jobs });
  } catch (err) {
    console.error("Job Radar analyze error:", err);
    return NextResponse.json(
      { error: "Failed to analyze job fit right now." },
      { status: 500 }
    );
  }
}
