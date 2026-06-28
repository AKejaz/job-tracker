// Server-side only. Never import this from a client component — the API key must
// never reach the browser, same rule as GROQ_API_KEY and SUPABASE_SECRET_KEY.

const TAVILY_API_URL = "https://api.tavily.com/search";

type TavilyResult = {
  title?: string;
  content?: string;
};

type TavilyResponse = {
  results?: TavilyResult[];
};

/**
 * Looks up recent news, market trends, and core values for a company via Tavily,
 * and returns a short plain-text summary suitable for dropping into a prompt.
 *
 * Never throws. If the API key is missing, the company name is empty, the request
 * fails, or no results come back, it returns "" so the caller can proceed without
 * company context instead of failing the whole feature.
 */
export async function getCompanyContext(companyName: string, location?: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || !companyName.trim()) return "";

  const query = location?.trim()
    ? `${companyName} ${location} recent news, market trends, and core company values`
    : `${companyName} recent news, market trends, and core company values`;

  try {
    const res = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
        search_depth: "basic",
      }),
    });

    if (!res.ok) {
      console.error("Tavily request failed:", res.status, await res.text().catch(() => ""));
      return "";
    }

    const data = (await res.json()) as TavilyResponse;
    const results = data.results ?? [];
    if (results.length === 0) return "";

    const summary = results
      .slice(0, 5)
      .map((r) => r.content?.trim())
      .filter(Boolean)
      .join("\n\n");

    // Keep this bounded so it doesn't blow up the Groq prompt size.
    return summary.slice(0, 3000);
  } catch (err) {
    console.error("Tavily fetch error:", err);
    return "";
  }
}
