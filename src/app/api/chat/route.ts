import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groq, GROQ_MODEL } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { messages } = await req.json() as { messages: { role: "user" | "assistant"; content: string }[] };

  // Pull real data so the assistant answers from actual numbers, not guesses.
  const { data: apps } = await supabase
    .from("applications")
    .select("company_name, job_title, medium, status, applied_at, pay")
    .order("applied_at", { ascending: false })
    .limit(500);

  const list = apps ?? [];
  const total = list.length;
  const byStatus: Record<string, number> = {};
  const byMedium: Record<string, number> = {};
  for (const a of list) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    const m = a.medium ?? "other";
    byMedium[m] = (byMedium[m] ?? 0) + 1;
  }
  const last7 = list.filter((a) => Date.now() - new Date(a.applied_at).getTime() < 7 * 86400000).length;
  const last30 = list.filter((a) => Date.now() - new Date(a.applied_at).getTime() < 30 * 86400000).length;

  const systemPrompt = `You are a sharp, honest job-search analyst helping the user understand their own
application data. Be concrete and metric-led, never vague or falsely encouraging. Keep answers short
(3-6 sentences unless asked for detail). If asked for a "weekly summary," write a tight narrative covering
volume, channel performance, and what to adjust — grounded only in the numbers given.

Current data snapshot:
- Total applications logged (all time): ${total}
- Applications in last 7 days: ${last7}
- Applications in last 30 days: ${last30}
- By status: ${JSON.stringify(byStatus)}
- By channel: ${JSON.stringify(byMedium)}
- Most recent 15 applications: ${JSON.stringify(list.slice(0, 15).map((a) => ({
    company: a.company_name, title: a.job_title, medium: a.medium, status: a.status, date: a.applied_at,
  })))}

Only use the data above — do not invent companies, numbers, or outcomes not present here.`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.4,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  const reply = completion.choices[0]?.message?.content ?? "I couldn't generate a response.";
  return NextResponse.json({ reply });
}
