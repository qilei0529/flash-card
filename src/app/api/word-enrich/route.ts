import { NextRequest, NextResponse } from "next/server";
import { enrichWordsWithOpenAI } from "@/lib/openai-word";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { words, targetLang, model } = body;

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { error: "words array is required and must not be empty" },
        { status: 400 }
      );
    }

    const normalized = words
      .map((w: unknown) => (typeof w === "string" ? w.trim() : ""))
      .filter(Boolean);

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "No valid words provided" },
        { status: 400 }
      );
    }

    const results = await enrichWordsWithOpenAI(
      normalized,
      typeof targetLang === "string" ? targetLang : "Chinese",
      typeof model === "string" ? model : undefined
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Word enrich API error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message.includes("OPENAI_API_KEY") || message.includes("API key")
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
