import { getDecks, createDeck } from "@/lib/deck";
import { createCard } from "@/lib/card";
import type { WordCardData } from "@/types";

let demoEnsured = false;

const DEMO_WORDS: WordCardData[] = [
  { word: "hello", translation: "你好" },
  { word: "world", translation: "世界" },
  { word: "apple", translation: "苹果" },
  { word: "book", translation: "书" },
  { word: "water", translation: "水" },
];

export async function ensureDemoDeck(): Promise<void> {
  if (demoEnsured) return;
  const list = await getDecks();
  if (list.length > 0) return;

  const deck = await createDeck("Demo", "English");
  for (const data of DEMO_WORDS) {
    await createCard(deck.id, "word", data);
  }
  demoEnsured = true;
}
