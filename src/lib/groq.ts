import Groq from "groq-sdk";

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Cheap, fast model for structured extraction tasks.
export const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function groqJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as T;
}
