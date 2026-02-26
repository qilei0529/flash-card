import type {
  CardType,
  WordCardData,
  SentenceCardData,
  CefrLevel,
} from "@/types";

export interface ParsedCardProgress {
  due?: string;
  stability?: number;
  difficulty?: number;
  elapsedDays?: number;
  scheduledDays?: number;
  learningSteps?: number;
  reps?: number;
  lapses?: number;
  state?: number;
  lastReview?: string | null;
}

export interface ParsedCard {
  type: CardType;
  data: WordCardData | SentenceCardData;
  progress?: ParsedCardProgress;
}

function findFSRSColumnIndices(headerRow: string[]): Record<string, number> | null {
  const lower = headerRow.map((c) => (c ?? "").trim().toLowerCase());
  const dueIdx = lower.findIndex((c) => c === "due");
  if (dueIdx < 0) return null;
  // Export order: type, due, stability, difficulty, elapsedDays, scheduledDays, learningSteps, reps, lapses, state, lastReview
  const names = ["type", "due", "stability", "difficulty", "elapseddays", "scheduleddays", "learningsteps", "reps", "lapses", "state", "lastreview"];
  const indices: Record<string, number> = {};
  for (let j = 0; j < names.length; j++) {
    const idx = dueIdx - 1 + j;
    if (idx >= 0 && idx < lower.length) indices[names[j]] = idx;
  }
  return Object.keys(indices).length >= 2 ? indices : null;
}

function parseProgressFromRow(row: string[], indices: Record<string, number>): ParsedCardProgress | undefined {
  const get = (key: string) => {
    const i = indices[key];
    return i !== undefined && i < row.length ? (row[i] ?? "").trim() : "";
  };
  const due = get("due");
  if (!due) return undefined;

  const parseNum = (key: string) => {
    const s = get(key);
    if (!s) return undefined;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : undefined;
  };
  const parseIntVal = (key: string) => {
    const s = get(key);
    if (!s) return undefined;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : undefined;
  };

  const progress: ParsedCardProgress = { due };
  const stability = parseNum("stability");
  if (stability !== undefined) progress.stability = stability;
  const difficulty = parseNum("difficulty");
  if (difficulty !== undefined) progress.difficulty = difficulty;
  const elapsedDays = parseIntVal("elapseddays");
  if (elapsedDays !== undefined) progress.elapsedDays = elapsedDays;
  const scheduledDays = parseIntVal("scheduleddays");
  if (scheduledDays !== undefined) progress.scheduledDays = scheduledDays;
  const learningSteps = parseIntVal("learningsteps");
  if (learningSteps !== undefined) progress.learningSteps = learningSteps;
  const reps = parseIntVal("reps");
  if (reps !== undefined) progress.reps = reps;
  const lapses = parseIntVal("lapses");
  if (lapses !== undefined) progress.lapses = lapses;
  const state = parseIntVal("state");
  if (state !== undefined) progress.state = state;
  const lastReview = get("lastreview");
  if (lastReview) progress.lastReview = lastReview;
  else progress.lastReview = null;

  return progress;
}

/**
 * Parse CSV text. Supports comma or tab separator.
 * Detects format:
 * - 2 columns → sentence type (sentence, translation)
 * - 3+ columns → word type (word, translation, pronunciation, partOfSpeech, definition, exampleSentence)
 * When header contains FSRS columns (due, stability, etc.), parses progress into ParsedCard.progress
 */
export function parseCSV(text: string): ParsedCard[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const sep = text.includes("\t") ? "\t" : ",";
  const rows = lines.map((line) => parseCSVLine(line, sep));

  let start = 0;
  let hasHeader = false;
  let isSentenceHeader = false;
  let contentColCount: number | null = null;
  let fsrsIndices: Record<string, number> | null = null;

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
      "level",
    ];
    const firstRowLower = first.map((c) => c?.toLowerCase() || "");
    hasHeader = firstRowLower.some((cell) =>
      headerKeywords.some((kw) => cell.includes(kw))
    );
    if (hasHeader) {
      const firstCell = firstRowLower[0] ?? "";
      if (firstCell.includes("sentence") && !firstCell.includes("word")) {
        isSentenceHeader = true;
      }
      fsrsIndices = findFSRSColumnIndices(first);
      if (fsrsIndices && typeof fsrsIndices.type === "number") {
        contentColCount = fsrsIndices.type;
      }
      start = 1;
    }
  }

  const cards: ParsedCard[] = [];
  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    const colCount = row.length;

    if (colCount < 2) continue;

    const useContentCols = contentColCount ?? colCount;
    const effectiveColCount = Math.min(colCount, useContentCols);

    let cardType: CardType;
    let data: WordCardData | SentenceCardData;

    if (isSentenceHeader || effectiveColCount <= 2) {
      const sentence = (row[0] ?? "").trim();
      const translation = (row[1] ?? "").trim();
      if (!sentence && !translation) continue;
      cardType = "sentence";
      data = { sentence, translation };
    } else {
      const word = (row[0] ?? "").trim();
      const translation = (row[1] ?? "").trim();
      const pronunciation = (row[2] ?? "").trim() || undefined;
      const partOfSpeech = (row[3] ?? "").trim() || undefined;
      const definition = (row[4] ?? "").trim() || undefined;
      const exampleSentence = (row[5] ?? "").trim() || undefined;
      let level: CefrLevel | undefined;
      if (effectiveColCount >= 7) {
        const rawLevel = (row[6] ?? "").trim().toUpperCase();
        const validLevels: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
        if (validLevels.includes(rawLevel as CefrLevel)) level = rawLevel as CefrLevel;
      }
      if (!word && !translation) continue;
      cardType = "word";
      data = { word, translation, pronunciation, partOfSpeech, definition, exampleSentence, level };
    }

    // If header has type column, prefer it over inferred type
    if (fsrsIndices && typeof fsrsIndices.type === "number" && row[fsrsIndices.type]) {
      const t = (row[fsrsIndices.type] ?? "").trim().toLowerCase();
      if (t === "word" || t === "sentence") cardType = t;
    }

    const progress = fsrsIndices ? parseProgressFromRow(row, fsrsIndices) : undefined;
    cards.push({ type: cardType, data, progress });
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

/**
 * Parse words-only text. Split by comma, newline, or tab; trim; dedupe by lower case.
 * Use when import format is "words only" (e.g. apple, banana, orange).
 */
export function parseWordsOnly(text: string): string[] {
  const tokens = text
    .split(/[\s,\t\n\r]+/)
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter((s) => s.length > 0);
  const seen = new Set<string>();
  return tokens.filter((t) => {
    const key = t.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
