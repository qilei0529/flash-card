import OpenAI from "openai";
import type { WordCardData } from "@/types";

const BATCH_SIZE = 10;

export interface EnrichResult extends WordCardData {
  word: string;
}

function buildPrompt(words: string[], targetLang: string, sourceLang: string = "English"): string {
  const exampleSentenceLang = sourceLang === "French" ? "French" : "English";
  const wordLang = sourceLang === "French" ? "French" : "English";
  
  return `You are a vocabulary assistant. For each ${wordLang} word, provide:
- translation: multiple translations/explanations in ${targetLang}, separated by commas (e.g., "翻译1, 翻译2, 翻译3")
- pronunciation: IPA format, e.g. /ˈæpəl/
- partOfSpeech: noun, verb, adj, etc.
- definition: brief definition in ${wordLang}
- exampleSentence: a simple example sentence in ${exampleSentenceLang}

Return a JSON array. Each element must have: word, translation, pronunciation, partOfSpeech, definition, exampleSentence.

Words: ${words.join(", ")}

Output only valid JSON, no markdown.`;
}

function parseResponse(content: string, words: string[]): EnrichResult[] {
  const cleaned = content.replace(/^```json?\s*|\s*```$/g, "").trim();
  let arr: unknown[];
  try {
    arr = JSON.parse(cleaned) as unknown[];
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];

  const wordSet = new Set(words.map((w) => w.toLowerCase()));
  const results: EnrichResult[] = [];

  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const word = String(o.word ?? "").trim();
    if (!word || !wordSet.has(word.toLowerCase())) continue;

    results.push({
      word,
      translation: String(o.translation ?? "").trim(),
      pronunciation: (o.pronunciation ? String(o.pronunciation).trim() : undefined) || undefined,
      partOfSpeech: (o.partOfSpeech ? String(o.partOfSpeech).trim() : undefined) || undefined,
      definition: (o.definition ? String(o.definition).trim() : undefined) || undefined,
      exampleSentence: (o.exampleSentence ? String(o.exampleSentence).trim() : undefined) || undefined,
    });
  }
  return results;
}

export async function enrichWordsWithOpenAI(
  words: string[],
  targetLang: string = "Chinese",
  sourceLang: string = "English",
  model?: string
): Promise<EnrichResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  const appCode = process.env.OPENAI_APP_CODE?.trim();
  const client = new OpenAI({
    apiKey,
    ...(baseURL && { baseURL }),
    ...(appCode && { defaultHeaders: { "APP-Code": appCode } }),
  });
  const allResults: EnrichResult[] = [];

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    const prompt = buildPrompt(batch, targetLang, sourceLang);

    const completion = await client.chat.completions.create({
      model: model || process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) continue;

    const batchResults = parseResponse(content, batch);
    allResults.push(...batchResults);
  }

  return allResults;
}
