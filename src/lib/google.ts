const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to refresh Google access token: ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to exchange code: ${await res.text()}`);
  }
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>;
}

type GmailMessageMeta = {
  id: string;
  subject: string;
  sender: string;
  snippet: string;
  internalDate: string;
};

export async function listRecentMessages(accessToken: string, afterUnixSeconds: number): Promise<string[]> {
  const q = encodeURIComponent(`after:${afterUnixSeconds}`);
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=25`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Gmail list failed: ${await res.text()}`);
  const data = await res.json();
  return (data.messages ?? []).map((m: { id: string }) => m.id);
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};

function extractBodyText(payload: GmailPart): string {
  // Prefer plain text; fall back to stripped HTML. Walk nested multipart structures.
  let plain = "";
  let html = "";

  function walk(part: GmailPart) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      plain += decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      html += decodeBase64Url(part.body.data);
    }
    if (part.parts) part.parts.forEach(walk);
  }
  walk(payload);

  const text = plain.trim() || stripHtml(html);
  // Cap length to keep Groq prompts cheap and fast; the useful info is always near the top.
  return text.slice(0, 3000);
}

export async function getMessageMeta(accessToken: string, id: string): Promise<GmailMessageMeta> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Gmail get failed: ${await res.text()}`);
  const data = await res.json();
  const headers: { name: string; value: string }[] = data.payload?.headers ?? [];
  const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
  const sender = headers.find((h) => h.name === "From")?.value ?? "";
  const bodyText = data.payload ? extractBodyText(data.payload) : (data.snippet ?? "");

  return {
    id,
    subject,
    sender,
    snippet: bodyText || data.snippet || "",
    internalDate: data.internalDate,
  };
}
