import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    GOOGLE_CLIENT_ID: Boolean(process.env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    SUPABASE_SECRET_KEY: Boolean(process.env.SUPABASE_SECRET_KEY),
    GROQ_API_KEY: Boolean(process.env.GROQ_API_KEY),
  });
}