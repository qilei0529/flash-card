import { parseCSV, parseWordsOnly, type ParsedCard } from "./csv";

export type { ParsedCard };
export { parseWordsOnly };

/**
 * Parse import text. Supports:
 * - CSV (comma or tab separated)
 *   - 2 columns: sentence, translation (sentence type)
 *   - 3+ columns: word, translation, pronunciation, partOfSpeech, definition, exampleSentence (word type);
 *     optional trailing CEFR level (A1–C2)
 *   - With FSRS progress: same layouts with columns after content matching deck export
 *     (“导出 CSV (含学习)” full rows, or “精简 CSV (单词+FSRS)” as `word,type,due,…`)
 * - Anki plain text export (tab separated)
 */
export function parseImportText(text: string): ParsedCard[] {
  return parseCSV(text);
}
