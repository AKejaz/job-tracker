import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groq, GROQ_MODEL } from "@/lib/groq";
import { getCompanyContext } from "@/lib/tavily";

type RequestBody = {
  cvText: string;
  jobDescription: string;
  companyName: string;
  position: string;
  location?: string;
};

// Plain markdown output — deliberately NOT using groqJSON() here because
// the guide is a long freeform report, not a structured JSON object.
const SYSTEM_PROMPT = `You are an expert interview coach and career strategist with deep knowledge of hiring processes across GCC and global markets.

Generate a comprehensive, highly detailed Interview Intel Guide in markdown format. Be specific to the candidate's actual CV and the exact role — never give generic advice. Ground every Q&A answer in real experience listed in the CV.

Structure the report with exactly these ## sections in this order:

## Company Intel
Cover the company's current state, business model, recent news, market position, core values, and any strategic priorities relevant to this role. Base this strictly on the research context provided; do not fabricate facts. If no research was provided, note that and offer what can be inferred from the job description.

## Key Terminologies & Metrics
List the domain-specific terms, technologies, frameworks, KPIs, and metrics the candidate must know cold for this role. Explain each briefly. Use **bold** for each term.

## Technical & Hard Skills Q&A
Provide 6–10 likely technical questions with detailed suggested answers. Each answer must be grounded in the candidate's CV — reference their actual projects, tools, and experience. Use **Q:** and **A:** prefixes. Format answers in STAR method where applicable (Situation, Task, Action, Result).

## Behavioral Q&A
Provide 5–8 behavioral questions with suggested answers grounded in the CV. Cover leadership, conflict resolution, prioritisation, failure, and collaboration scenarios. Use **Q:** and **A:** prefixes.

## Additional Likely Questions
List 5–6 more questions the interviewer is likely to ask about this specific role/company combination, with brief answer pointers (not full answers). These should be role-specific, not generic.

Formatting rules:
- Use ## for main section headings, ### for sub-headings within sections
- Use **bold** for important terms, role titles, and key concepts
- Use - bullet lists for lists of items
- Be comprehensive and specific — this guide should be detailed enough to walk into any interview with full confidence`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const cvText = body.cvText?.trim() ?? "";
  const jobDescription = body.jobDescription?.trim() ?? "";
  const companyName = body.companyName?.trim() ?? "";
  const position = body.position?.trim() ?? "";
  const location = body.location?.trim() ?? "";

  if (!cvText || !jobDescription) {
    return NextResponse.json(
      { error: "CV text and job description are both required." },
      { status: 400 }
    );
  }
  if (!companyName || !position) {
    return NextResponse.json(
      { error: "Company name and position are both required." },
      { status: 400 }
    );
  }

  // Best-effort company research — guide generation continues even if Tavily fails.
  const companyContext = await getCompanyContext(companyName, location);

  const userPrompt = `CANDIDATE'S CV:
"""
${cvText}
"""

TARGET POSITION: ${position}
TARGET COMPANY: ${companyName}
LOCATION: ${location || "(not specified)"}

JOB DESCRIPTION:
"""
${jobDescription}
"""

COMPANY RESEARCH (recent news / values / market trends — may be empty if unavailable):
"""
${companyContext || "(no company research available — base Company Intel on the job description and any general knowledge you have about this company/industry)"}
"""

Generate a comprehensive, detailed Interview Intel Guide for this candidate targeting this specific role at this company.`;

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.5,
      max_tokens: 4000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const guide = completion.choices[0]?.message?.content ?? "";
    if (!guide) {
      return NextResponse.json(
        { error: "The AI returned an empty response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ guide, hadCompanyContext: Boolean(companyContext) });
  } catch (err) {
    console.error("Interview intel generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate the interview guide. Please try again." },
      { status: 500 }
    );
  }
}
