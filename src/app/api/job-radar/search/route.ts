import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Hobby plan caps real execution around 10s regardless of this value, but we set it
// in case the project ever moves to Pro — costs nothing on Hobby. This route now
// does JSearch ONLY (no Groq), so it has the full ~10s window to itself instead of
// sharing it with the fit-analysis call — see /api/job-radar/analyze/route.ts and
// PROJECT_CONTEXT #16 for the reliability fix this is part of.
export const maxDuration = 30;

type JobType = "on_site" | "hybrid" | "remote";

type RadarRequestBody = {
  city: string;
  degree: string;
  jobType: JobType;
  country?: string;
  // No longer read in this route — kept in the type for request-shape parity with
  // the frontend, which still sends it here. Fit analysis now happens in a separate
  // call to /api/job-radar/analyze, which receives cvText directly from the client.
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

const VALID_JOB_TYPES: JobType[] = ["on_site", "hybrid", "remote"];

function buildSearchQuery(degree: string, city: string, jobType: JobType, country?: string) {
  const parts = [`${degree} jobs`];
  // Don't put "on-site" as a text keyword — JSearch's NLP treats it inconsistently
  // and it can hurt result counts. Remote/hybrid signals are handled via the
  // remote_jobs_only param and the "hybrid" keyword below.
  if (jobType === "hybrid") parts.push("hybrid");
  parts.push(`in ${city}`);
  // Always include country when provided — critical for cities like Islamabad
  // that exist in multiple countries. Previously excluded for on_site, which was
  // the reason searches returned only 1 result (JSearch couldn't resolve the city).
  if (country) parts.push(country);
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
  // Bumped back up from 5000ms to 8000ms. The 5s cap existed only to leave room for
  // the Groq fit-analysis call that used to run in this same function — now that
  // Groq lives in its own route (/api/job-radar/analyze), JSearch can use nearly the
  // full ~10s Vercel Hobby budget by itself, which is the actual fix for the
  // 504/empty-result/inconsistent-star-rating symptoms.
  const timeout = setTimeout(() => controller.abort(), 8000);

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
      return NextResponse.json({ jobs: [], rawJobs: [] });
    }

    // No Groq call here anymore — fit analysis happens in a follow-up request to
    // /api/job-radar/analyze, kicked off by the frontend right after this response
    // comes back. whyFit/starRating start as placeholders ("" / 0) and the
    // JobRadarView UI renders a loading indicator for rows in that state.
    const jobs: RadarJob[] = rawJobs.map((j) => ({
      id: j.job_id,
      company: j.employer_name ?? "Unknown company",
      title: j.job_title ?? "Unknown role",
      location: locationLabel(j),
      isRemote: Boolean(j.job_is_remote),
      applyLink: j.job_apply_link ?? "",
      whyFit: "",
      starRating: 0,
    }));

    // rawJobs is returned alongside the display-ready jobs so the frontend can
    // forward it verbatim to /api/job-radar/analyze — the client has no other copy
    // of JSearch's raw fields (job_description, etc.) needed for fit scoring.
    return NextResponse.json({ jobs, rawJobs });
  } catch (err) {
    console.error("Job Radar search error:", err);
    return NextResponse.json(
      { error: "Failed to search for jobs right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
