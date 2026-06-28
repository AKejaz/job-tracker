import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groqJSON } from "@/lib/groq";

type SectionScores = {
  formatting_clarity: number;
  content_relevance: number;
  impact_quantification: number;
  ats_compatibility: number;
};

type StrengthItem = { title: string; detail: string };
type ImprovementItem = { title: string; detail: string; priority: "high" | "medium" | "low" };
type StrategyItem = { title: string; detail: string };

export type CvReport = {
  overall_score: number;
  summary: string;
  section_scores: SectionScores;
  strengths: StrengthItem[];
  improvements: ImprovementItem[];
  future_strategies: StrategyItem[];
};

const SYSTEM_PROMPT = `You are an expert CV/resume reviewer and career coach. You specialize in ATS
optimization and recruiter screening standards for professional roles, with particular familiarity
with hiring norms in the Gulf (UAE, Saudi Arabia, Qatar) and Pakistan job markets, as well as
general international standards.

Given a candidate's CV text, and optionally a target role and/or a target job description, you
must return a structured evaluation as STRICT JSON ONLY — no markdown formatting, no preamble, no
code fences, just the raw JSON object, in exactly this shape:

{
  "overall_score": number,            // 0-100. Be realistic and differentiated — do not default to
                                       // round numbers like 70/80/90 unless genuinely warranted by
                                       // the content. A mediocre CV should score in the 40s-60s.
  "summary": string,                  // 2-3 sentences. Honest overall impression, written directly
                                       // to the candidate ("Your CV..."), not generic.
  "section_scores": {
    "formatting_clarity": number,     // 0-100: structure, readability, length, consistency, layout
    "content_relevance": number,      // 0-100: relevance of experience/skills to the target role
                                       // (or, if none given, to the candidate's apparent career
                                       // direction based on the CV itself)
    "impact_quantification": number,  // 0-100: use of metrics, outcomes, results, and strong action
                                       // verbs vs. vague duty-listing ("responsible for...")
    "ats_compatibility": number       // 0-100: standard section headers, keyword presence, parseable
                                       // structure, absence of tables/columns/graphics that break
                                       // ATS parsing
  },
  "strengths": [                      // 3-6 items. Each MUST reference something specific and real
    { "title": string, "detail": string }   // from this CV (an actual job title, project, number,
  ],                                         // or phrase used) — never generic praise like "good
                                              // formatting" with no specifics.
  "improvements": [                   // 0-6 items, each with a priority. CRITICAL RULE: if the CV
    {                                  // is genuinely strong in every area you assess, this array
      "title": string,                // should be empty or near-empty. Do NOT invent weaknesses
      "detail": string,               // just to populate this list. Only include real, specific,
      "priority": "high"|"medium"|"low"  // actionable issues tied to actual CV content.
    }
  ],
  "future_strategies": [              // 2-5 items. Forward-looking, strategic suggestions — these
    { "title": string, "detail": string }  // apply regardless of current CV quality: e.g. building
  ]                                         // a portfolio, targeting a certification, tailoring per
                                            // application, expanding into adjacent roles, networking
                                            // moves. Always populate this, even for an excellent CV.
}

Scoring guidance:
- Reference specific lines, numbers, or phrasing from the CV in your reasoning wherever possible.
- If a target role or job description is provided, evaluate "content_relevance" and the overall
  score against that target specifically, and call out concrete keyword/skill gaps relative to it
  in "improvements" if relevant.
- If no target role is given, infer the candidate's apparent career direction from the CV itself
  and evaluate coherence and relevance against that.
- Do not pad any list with filler. Quality and specificity over quantity.
- Output must be valid JSON and nothing else.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { resume_text, target_role, job_description } = await req.json();

  if (!resume_text || typeof resume_text !== "string" || resume_text.trim().length < 50) {
    return NextResponse.json(
      { error: "resume_text is required and must contain enough CV content to analyze" },
      { status: 400 }
    );
  }

  const contextLines = [
    target_role ? `Target role: ${target_role}` : null,
    job_description ? `Target job description:\n${job_description}` : null,
  ].filter(Boolean).join("\n\n");

  const userPrompt = contextLines
    ? `${contextLines}\n\nCandidate CV:\n${resume_text}`
    : `No specific target role provided — evaluate based on the candidate's own apparent career direction.\n\nCandidate CV:\n${resume_text}`;

  try {
    const report = await groqJSON<CvReport>(SYSTEM_PROMPT, userPrompt);

    // Basic shape safety net — Groq's JSON mode is reliable but we don't persist anything,
    // so a malformed response should fail loudly rather than render a broken report.
    if (
      typeof report.overall_score !== "number" ||
      !report.section_scores ||
      !Array.isArray(report.strengths) ||
      !Array.isArray(report.improvements) ||
      !Array.isArray(report.future_strategies)
    ) {
      throw new Error("Malformed report shape from model");
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("CV analyzer error:", err);
    return NextResponse.json(
      { error: "Failed to analyze CV. Please try again." },
      { status: 500 }
    );
  }
}
