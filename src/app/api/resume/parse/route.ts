import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import mammoth from "mammoth";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    let text = "";

    if (name.endsWith(".pdf")) {
      // Import the lib directly, not the package root — the root index.js has a
      // debug-mode code path that tries to read a bundled test PDF in some module
      // resolution setups, which fails in production. The lib export has no such issue.
      const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".doc")) {
      return NextResponse.json(
        { error: "Old .doc format isn't supported — please save as .docx or PDF and try again." },
        { status: 400 }
      );
    } else if (name.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use PDF, DOCX, or TXT." }, { status: 400 });
    }

    text = text.trim();
    if (!text) {
      return NextResponse.json(
        { error: "Couldn't extract any text — the file might be a scanned image rather than real text." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error("Resume parse error:", err);
    return NextResponse.json({ error: "Failed to parse this file. Try a different format." }, { status: 500 });
  }
}
