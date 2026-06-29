import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groq, GROQ_MODEL } from "@/lib/groq";

// Hobby plan caps real execution around 10s regardless of this value, but we set it
// in case the project ever moves to Pro — costs nothing on Hobby.
export const maxDuration = 30;

type JobType = "on_site" | "hybrid" | "remote";

type RadarRequestBody = {
  city: string;
  degree: string;
  jobType: JobType;
  country?: string;
  cvText?: string;
};

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

export type RadarJob = {
  id: string;
  company: string;
  title: string;
  location: string;
  isRemote: boolean;
  applyLink: string;
  whyFit: string;
  starRating: number;
};

type GroqAnalysis = {
  jobs: { index: number; why_fit: string; star_rating: number }[];
};

const VALID_JOB_TYPES: JobType[] = ["on_site", "hybrid", "remote"];

function buildSearchQuery(degree: string, city: string, jobType: JobType, country?: string) {
  const parts = [`${degree} jobs`];
  if (jobType === "hybrid") parts.push("hybrid");
  if (jobType === "on_site") parts.push("on-site");
  parts.push(`in ${city}`);
  if (country && jobType !== "on_site") parts.push(country);
  return parts.join(" ");
}

function locationLabel(job: JSearchJob): string {
  if (job.job_is_remote) return "Remote";
  return [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", ") || "—";
}

async function fetchJSearchResults(query: string, remoteOnly: boolean): Promise<JSearchJob[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new Error("RAPIDAPI_KEY is not configured.");

  const params = new URLSearchParams({
    query,
    page: "1",
    num_pages: "1",
  });
  if (remoteOnly) params.set("remote_jobs_only", "true");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params.toString()}`, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`JSearch returned ${res.status}`);
    }

    const json = await res.json();
    const data: JSearchJob[] = json?.data ?? [];
    return data.slice(0, 12);
  } finally {
    clearTimeout(timeout);
  }
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
    response_format: { type: "json_object" },
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

  let body: RadarRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const city = body.city?.trim() ?? "";
  const degree = body.degree?.trim() ?? "";
  const jobType = body.jobType;
  const country = body.country?.trim() ?? "";
  const cvText = body.cvText?.trim() ?? "";

  if (!city || !degree || !jobType || !VALID_JOB_TYPES.includes(jobType)) {
    return NextResponse.json(
      { error: "City, degree, and a valid job type (on_site, hybrid, or remote) are required." },
      { status: 400 }
    );
  }

  try {
    const query = buildSearchQuery(degree, city, jobType, country);
    const rawJobs = await fetchJSearchResults(query, jobType === "remote");

    if (rawJobs.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const analysis = await analyzeFit(rawJobs, cvText);
    const byIndex = new Map(analysis.jobs.map((a) => [a.index, a]));

    const jobs: RadarJob[] = rawJobs.map((j, i) => {
      const a = byIndex.get(i);
      return {
        id: j.job_id,
        company: j.employer_name ?? "Unknown company",
        title: j.job_title ?? "Unknown role",
        location: locationLabel(j),
        isRemote: Boolean(j.job_is_remote),
        applyLink: j.job_apply_link ?? "",
        whyFit: a?.why_fit ?? "Add your CV for a personalized fit analysis.",
        starRating: a && a.star_rating >= 1 && a.star_rating <= 5 ? Math.round(a.star_rating) : 3,
      };
    });

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("Job Radar search error:", err);
    return NextResponse.json(
      { error: "Failed to search for jobs right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
