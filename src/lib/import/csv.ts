import type { CardType, WordCardData, SentenceCardData } from "@/types";

export interface ParsedCard {
  type: CardType;
  data: WordCardData | SentenceCardData;
}

/**
 * Parse CSV text. Supports comma or tab separator.
 * Detects format:
 * - 2 columns → sentence type (sentence, translation)
 * - 3+ columns → word type (word, translation, pronunciation, partOfSpeech, definition, exampleSentence)
 */
export function parseCSV(text: string): ParsedCard[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const sep = text.includes("\t") ? "\t" : ",";
  const rows = lines.map((line) => parseCSVLine(line, sep));

  // Detect header row
  let start = 0;
  let hasHeader = false;
  if (rows.length > 0) {
    const first = rows[0];
    const headerKeywords = [
      "word",
      "sentence",
      "front",
      "back",
      "translation",
      "pronunciation",
      "partofspeech",
      "definition",
      "examplesentence",
    ];
    const firstRowLower = first.map((c) => c?.toLowerCase() || "");
    hasHeader = firstRowLower.some((cell) =>
      headerKeywords.some((kw) => cell.includes(kw))
    );
    if (hasHeader) start = 1;
  }

  const cards: ParsedCard[] = [];
  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    const colCount = row.length;

    if (colCount >= 2) {
      if (colCount === 2) {
        // Sentence type: sentence, translation
        const sentence = (row[0] ?? "").trim();
        const translation = (row[1] ?? "").trim();
        if (sentence || translation) {
          cards.push({
            type: "sentence",
            data: {
              sentence,
              translation,
            },
          });
        }
      } else {
        // Word type: word, translation, pronunciation?, partOfSpeech?, definition?, exampleSentence?
        const word = (row[0] ?? "").trim();
        const translation = (row[1] ?? "").trim();
        const pronunciation = (row[2] ?? "").trim() || undefined;
        const partOfSpeech = (row[3] ?? "").trim() || undefined;
        const definition = (row[4] ?? "").trim() || undefined;
        const exampleSentence = (row[5] ?? "").trim() || undefined;

        if (word || translation) {
          cards.push({
            type: "word",
            data: {
              word,
              translation,
              pronunciation,
              partOfSpeech,
              definition,
              exampleSentence,
            },
          });
        }
      }
    }
  }
  return cards;
}

function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      if (c === "\\") {
        current += line[++i] ?? "";
      } else {
        current += c;
      }
    } else if (c === sep) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}
