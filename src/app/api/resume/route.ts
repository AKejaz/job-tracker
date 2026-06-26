import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groqJSON } from "@/lib/groq";

type RoleMatch = { title: string; reasoning: string };
type CompanyMatch = { name: string; why: string };
type RoleMatchResponse = { matches: RoleMatch[]; companies: CompanyMatch[] };

const SYSTEM_PROMPT = `You are a career advisor. Given a candidate's resume text and a target location,
return strict JSON:
{
  "matches": [{ "title": string, "reasoning": string }],   // 6-10 specific job titles they're realistically
                                                              qualified for right now, not aspirational titles
  "companies": [{ "name": string, "why": string }]          // 6-10 real, specific companies (not generic
                                                              categories) operating in or hiring for the given
                                                              location, plausible fits for this candidate's
                                                              background, with one-sentence reasoning each
}
Keep reasoning grounded in specific resume content, not generic flattery. Be specific with company names —
prefer real companies known to operate or hire in that location over vague suggestions. If you are not
confident about current hiring activity, say so briefly in the reasoning rather than inventing specifics.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { resume_text, location } = await req.json();
  if (!resume_text || typeof resume_text !== "string") {
    return NextResponse.json({ error: "resume_text is required" }, { status: 400 });
  }

  const { data: resumeRow } = await supabase
    .from("resumes")
    .insert({ user_id: user.id, file_url: "inline-text", parsed_text: resume_text })
    .select("id")
    .single();

  const result = await groqJSON<RoleMatchResponse>(
    SYSTEM_PROMPT,
    `Target location: ${location || "Islamabad, Pakistan"}\n\nResume:\n${resume_text}`
  );

  const roleRows = result.matches.map((m) => ({
    user_id: user.id,
    resume_id: resumeRow?.id ?? null,
    suggested_title: m.title,
    reasoning: m.reasoning,
    market: location || "Islamabad",
  }));

  if (roleRows.length > 0) {
    await supabase.from("role_matches").insert(roleRows);
  }

  return NextResponse.json({ matches: result.matches, companies: result.companies ?? [] });
}
