import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 401, headers: corsHeaders() });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("extension_token", token)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "invalid token" }, { status: 401, headers: corsHeaders() });
  }

  const body = await req.json();
  const { company_name, job_title, medium, pay, job_url, applied_at } = body as {
    company_name?: string;
    job_title?: string;
    medium?: string;
    pay?: string;
    job_url?: string;
    applied_at?: string;
  };

  if (!company_name || !job_title) {
    return NextResponse.json({ error: "company_name and job_title are required" }, { status: 400, headers: corsHeaders() });
  }

  const VALID_MEDIUMS = ["linkedin", "indeed", "email", "company_site", "other"];
  const safeMedium = VALID_MEDIUMS.includes(medium ?? "") ? medium : "other";

  const { data: inserted, error } = await admin
    .from("applications")
    .insert({
      user_id: profile.id,
      company_name,
      job_title,
      pay: pay || null,
      job_url: job_url || null,
      source: "extension",
      medium: safeMedium,
      status: "applied",
      applied_at: applied_at || new Date().toISOString(),
      needs_review: false,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }

  return NextResponse.json({ status: "logged", application_id: inserted?.id }, { headers: corsHeaders() });
}
