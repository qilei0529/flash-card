import type { Card, WordCardData, SentenceCardData } from "@/types";
import { isWordCard, isSentenceCard } from "@/lib/card";

/**
 * Escape CSV field - wrap in quotes if contains comma, quote, or newline
 */
function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Convert cards to CSV format
 * - Word cards: word, translation, pronunciation, partOfSpeech, definition, exampleSentence, level
 * - Sentence cards: sentence, translation, level
 */
export function cardsToCSV(cards: Card[]): string {
  if (cards.length === 0) return "";

  const lines: string[] = [];
  
  // Check if we have word cards to determine header
  const hasWordCards = cards.some((c) => isWordCard(c));
  const hasSentenceCards = cards.some((c) => isSentenceCard(c));

  // Add header
  if (hasWordCards && hasSentenceCards) {
    // Mixed types - use word format (more columns)
    lines.push("word,translation,pronunciation,partOfSpeech,definition,exampleSentence,level");
  } else if (hasWordCards) {
    // Only word cards
    lines.push("word,translation,pronunciation,partOfSpeech,definition,exampleSentence,level");
  } else {
    // Only sentence cards
    lines.push("sentence,translation,level");
  }

  // Add data rows
  const useWordFormat = hasWordCards;
  
  for (const card of cards) {
    if (isWordCard(card)) {
      const data = card.data as WordCardData;
      const row = [
        escapeCSVField(data.word || ""),
        escapeCSVField(data.translation || ""),
        escapeCSVField(data.pronunciation || ""),
        escapeCSVField(data.partOfSpeech || ""),
        escapeCSVField(data.definition || ""),
        escapeCSVField(data.exampleSentence || ""),
        escapeCSVField(data.level || ""),
      ];
      lines.push(row.join(","));
    } else if (isSentenceCard(card)) {
      const data = card.data as SentenceCardData;
      if (useWordFormat) {
        // Mixed types: use word format, put sentence in first column
        const row = [
          escapeCSVField(data.sentence || ""),
          escapeCSVField(data.translation || ""),
          "", // pronunciation
          "", // partOfSpeech
          "", // definition
          "", // exampleSentence
          "", // level
        ];
        lines.push(row.join(","));
      } else {
        // Only sentence cards: use sentence format (with trailing level column)
        const row = [
          escapeCSVField(data.sentence || ""),
          escapeCSVField(data.translation || ""),
          "", // level
        ];
        lines.push(row.join(","));
      }
    }
  }

  return lines.join("\n");
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
