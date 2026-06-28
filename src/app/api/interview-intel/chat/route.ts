import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groq, GROQ_MODEL } from "@/lib/groq";

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { messages, context } = (await req.json()) as {
    messages: Message[];
    context: string;
  };

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "messages array is required." }, { status: 400 });
  }

  const systemPrompt = `You are an expert interview coach. Your job is to help the candidate prepare for their specific interview based on the Interview Intel Guide provided below.

Answer questions strictly in the context of this guide and the candidate's situation. If a question isn't covered by the guide, say so and offer practical coaching advice. Be direct, actionable, and confident — like a great coach, not a textbook.

Use **bold** for key advice and important terms. Use - bullet lists for multi-point answers. Keep answers focused and practical — no filler.

## INTERVIEW GUIDE FOR THIS CANDIDATE:
${context}`;

  try {
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
  } catch (err) {
    console.error("Interview intel chat error:", err);
    return NextResponse.json(
      { error: "Failed to respond. Please try again." },
      { status: 500 }
    );
  }
}
