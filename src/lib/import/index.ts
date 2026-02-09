import { parseCSV, type ParsedCard } from "./csv";

export type { ParsedCard };

/**
 * Parse import text. Supports:
 * - CSV (comma or tab separated)
 *   - 2 columns: sentence, translation (sentence type)
 *   - 3+ columns: word, translation, pronunciation, partOfSpeech, definition, exampleSentence (word type)
 * - Anki plain text export (tab separated)
 */
export function parseImportText(text: string): ParsedCard[] {
  return parseCSV(text);
}
