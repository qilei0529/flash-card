import OpenAI from "openai";

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  const appCode = process.env.OPENAI_APP_CODE?.trim();

  return new OpenAI({
    apiKey,
    ...(baseURL && { baseURL }),
    ...(appCode && { defaultHeaders: { "APP-Code": appCode } }),
  });
}

function extractLevel(raw: string): CefrLevel {
  const upper = raw.toUpperCase();
  const match = CEFR_LEVELS.find((lvl) => upper.includes(lvl));
  return match ?? "B1";
}

export async function getWordLevel(
  word: string,
  sourceLang: string = "English",
  model?: string
): Promise<{ word: string; level: CefrLevel }> {
  const client = createOpenAIClient();

  const prompt = [
    `You are a vocabulary difficulty classifier for language learners.`,
    `Given one ${sourceLang} word, classify its overall CEFR difficulty level.`,
    `You MUST answer with exactly ONE of these levels: A1, A2, B1, B2, C1, C2.`,
    ``,
    `Word: "${word}"`,
    ``,
    `Answer with ONLY the level (e.g., "B1"). No explanation, no extra text.`,
  ].join("\n");

  const completion = await client.chat.completions.create({
    model: model || process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You classify single words into CEFR difficulty levels (A1, A2, B1, B2, C1, C2) for language learners.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No response from OpenAI when classifying word level");
  }

  const level = extractLevel(content);
  return { word, level };
}

