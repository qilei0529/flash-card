import { NextRequest, NextResponse } from "next/server";
import { getWordLevel } from "@/lib/openai-level";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { word, sourceLang, model } = body as {
      word?: unknown;
      sourceLang?: unknown;
      model?: unknown;
    };

    if (typeof word !== "string" || !word.trim()) {
      return NextResponse.json(
        { error: "word is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const result = await getWordLevel(
      word.trim(),
      typeof sourceLang === "string" && sourceLang.trim()
        ? sourceLang.trim()
        : "English",
      typeof model === "string" && model.trim() ? model.trim() : undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Word level API error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      message.includes("OPENAI_API_KEY") || message.includes("API key")
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

