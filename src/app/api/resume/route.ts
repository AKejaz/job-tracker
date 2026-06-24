import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groqJSON } from "@/lib/groq";

type RoleMatch = { title: string; reasoning: string };
type RoleMatchResponse = { matches: RoleMatch[] };

const SYSTEM_PROMPT = `You are a career advisor specializing in the Islamabad/Rawalpindi, Pakistan tech and
business job market in 2026. Given a candidate's resume text, suggest 6-10 specific job title strings
they are realistically qualified to apply for right now in that market (not aspirational titles requiring
years they don't have). Return strict JSON: { "matches": [{ "title": string, "reasoning": string }] }.
Keep reasoning to one sentence each, grounded in specific resume content, not generic flattery.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { resume_text } = await req.json();
  if (!resume_text || typeof resume_text !== "string") {
    return NextResponse.json({ error: "resume_text is required" }, { status: 400 });
  }

  const { data: resumeRow } = await supabase
    .from("resumes")
    .insert({ user_id: user.id, file_url: "inline-text", parsed_text: resume_text })
    .select("id")
    .single();

  const result = await groqJSON<RoleMatchResponse>(SYSTEM_PROMPT, resume_text);

  const rows = result.matches.map((m) => ({
    user_id: user.id,
    resume_id: resumeRow?.id ?? null,
    suggested_title: m.title,
    reasoning: m.reasoning,
    market: "Islamabad",
  }));

  if (rows.length > 0) {
    await supabase.from("role_matches").insert(rows);
  }

  return NextResponse.json({ matches: result.matches });
}
