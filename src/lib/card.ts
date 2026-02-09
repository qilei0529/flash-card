import { db } from "./db";
import { getEmptyCardState } from "./fsrs";
import type {
  Card,
  CardType,
  WordCardData,
  SentenceCardData,
} from "@/types";

function generateId() {
  return crypto.randomUUID();
}

export async function getCardsByDeck(deckId: string): Promise<Card[]> {
  const cards = await db.cards.where("deckId").equals(deckId).toArray();
  return cards.filter((c) => !c.deletedAt);
}

export async function getDueCards(deckId?: string): Promise<Card[]> {
  const now = new Date().toISOString();
  const query = deckId
    ? db.cards.where("deckId").equals(deckId)
    : db.cards.toCollection();
  const cards = await query.toArray();
  return cards.filter((c) => !c.deletedAt && c.due <= now);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate proficiency score for a card (lower = less proficient = higher priority)
 * Priority factors:
 * - New cards (state 0) and Learning cards (state 1) get highest priority
 * - Lower stability = less proficient
 * - More lapses = less proficient
 * - Fewer reps = less proficient
 */
function calculateProficiencyScore(card: Card): number {
  // Base score from state (lower state = less proficient)
  // New (0) = 100, Learning (1) = 80, Review (2) = 40, Relearning (3) = 60
  let score = 0;
  if (card.state === 0) {
    score = 100; // New cards - highest priority
  } else if (card.state === 1) {
    score = 80; // Learning cards - high priority
  } else if (card.state === 3) {
    score = 60; // Relearning cards - medium-high priority
  } else {
    score = 40; // Review cards - lower priority
  }

  // Subtract stability (lower stability = higher priority)
  // Stability typically ranges from 0 to ~365, normalize to 0-50
  score += Math.max(0, 50 - card.stability * 0.1);

  // Add lapses (more lapses = less proficient = higher priority)
  score += Math.min(card.lapses * 10, 30);

  // Subtract reps (fewer reps = less proficient = higher priority)
  // Reps typically small, so multiply by 2
  score += Math.max(0, 20 - card.reps * 2);

  return score;
}

/**
 * Weighted random selection prioritizing less proficient cards
 */
function weightedRandomSelect<T>(
  items: T[],
  weights: number[],
  count: number
): T[] {
  if (items.length === 0) return [];
  if (items.length <= count) return items;

  const selected: T[] = [];
  const available = items.map((item, index) => ({ item, weight: weights[index] }));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  for (let i = 0; i < count; i++) {
    if (available.length === 0) break;

    // Calculate cumulative weights
    let cumulativeWeight = 0;
    const cumulativeWeights = available.map((a) => {
      cumulativeWeight += a.weight;
      return cumulativeWeight;
    });

    // Random selection based on weights
    const random = Math.random() * cumulativeWeight;
    let selectedIndex = 0;
    for (let j = 0; j < cumulativeWeights.length; j++) {
      if (random <= cumulativeWeights[j]) {
        selectedIndex = j;
        break;
      }
    }

    // Add selected item and remove from available
    selected.push(available[selectedIndex].item);
    available.splice(selectedIndex, 1);
  }

  return selected;
}

export async function getDueCardsForSession(
  deckId: string,
  limit: number = 30
): Promise<Card[]> {
  const allDueCards = await getDueCards(deckId);
  
  if (allDueCards.length === 0) return [];
  if (allDueCards.length <= limit) return shuffleArray(allDueCards);

  // Calculate proficiency scores (weights) for each card
  const weights = allDueCards.map((card) => calculateProficiencyScore(card));

  // Use weighted random selection to prioritize less proficient cards
  const selected = weightedRandomSelect(allDueCards, weights, limit);

  // Shuffle the selected cards for variety
  return shuffleArray(selected);
}

export async function createCard(
  deckId: string,
  type: CardType,
  data: WordCardData | SentenceCardData
): Promise<Card> {
  const fsrsState = getEmptyCardState();
  const now = new Date().toISOString();
  const card: Card = {
    id: generateId(),
    deckId,
    type,
    data,
    createdAt: now,
    updatedAt: now,
    ...fsrsState,
  };
  await db.cards.add(card);
  return card;
}

export async function updateCard(
  id: string,
  updates: {
    type?: CardType;
    data?: WordCardData | SentenceCardData;
  }
): Promise<void> {
  const card = await db.cards.get(id);
  if (!card) return;

  const updateData: Partial<Card> = {
    updatedAt: new Date().toISOString(),
  };

  if (updates.type !== undefined) {
    updateData.type = updates.type;
  }

  if (updates.data !== undefined) {
    updateData.data = updates.data;
  }

  await db.cards.update(id, updateData as any);
}

export function isWordCard(
  card: Card
): card is Card & { data: WordCardData; type: "word" } {
  return card.type === "word";
}

export function isSentenceCard(
  card: Card
): card is Card & { data: SentenceCardData; type: "sentence" } {
  return card.type === "sentence";
}

export async function deleteCard(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.cards.update(id, { deletedAt: now, updatedAt: now });
}

export async function getCard(id: string): Promise<Card | undefined> {
  return db.cards.get(id);
}

/**
 * Find an existing card by its content (word or sentence)
 * Matches word cards by word field, sentence cards by sentence field
 */
export async function findCardByContent(
  deckId: string,
  type: CardType,
  data: WordCardData | SentenceCardData
): Promise<Card | undefined> {
  const allCards = await db.cards
    .where("deckId")
    .equals(deckId)
    .toArray();
  
  const existingCards = allCards.filter((c) => !c.deletedAt && c.type === type);
  
  if (type === "word") {
    const wordData = data as WordCardData;
    return existingCards.find((c) => {
      if (isWordCard(c)) {
        return c.data.word.trim().toLowerCase() === wordData.word.trim().toLowerCase();
      }
      return false;
    });
  } else {
    const sentenceData = data as SentenceCardData;
    return existingCards.find((c) => {
      if (isSentenceCard(c)) {
        return c.data.sentence.trim().toLowerCase() === sentenceData.sentence.trim().toLowerCase();
      }
      return false;
    });
  }
}

/**
 * Upsert a card: update if exists (by word/sentence), create if not
 * Returns the card and whether it was updated (true) or created (false)
 */
export async function upsertCard(
  deckId: string,
  type: CardType,
  data: WordCardData | SentenceCardData
): Promise<{ card: Card; updated: boolean }> {
  const existing = await findCardByContent(deckId, type, data);
  
  if (existing) {
    // Update existing card with new data
    await updateCard(existing.id, { type, data });
    const updated = await db.cards.get(existing.id);
    return { card: updated!, updated: true };
  } else {
    // Create new card
    const card = await createCard(deckId, type, data);
    return { card, updated: false };
  }
}

/**
 * Check if a string contains Chinese characters
 */
function containsChinese(str: string): boolean {
  return /[\u4e00-\u9fa5]/.test(str);
}

/**
 * Check if a string contains English letters (a-z, A-Z)
 */
function containsEnglish(str: string): boolean {
  return /[a-zA-Z]/.test(str);
}

/**
 * Check if a word contains special symbols that should be considered dirty
 * Common special symbols: () [] {} <> - _ ! @ # $ % ^ & * + = | \ / ? ~ ` " ' : ; , . 
 * Also includes ellipsis: … (Unicode) or ... (three dots)
 * Excludes French l' prefix (e.g., l'eau, l'ami)
 */
function containsSpecialSymbols(str: string): boolean {
  // Check for ellipsis (Unicode character or three dots)
  if (str.includes('…') || str.includes('...')) {
    return true;
  }
  
  // Exclude French l' prefix (l'word or L'word format)
  // Remove l' prefix temporarily to check for other special symbols
  const withoutFrenchPrefix = str.replace(/^[lL]'/, '');
  
  // Check for common special symbols that shouldn't be in words
  const specialSymbolPattern = /[()[\]{}<>\-_!@#$%^&*+=|\\\/?~`"'.,:;]/;
  return specialSymbolPattern.test(withoutFrenchPrefix);
}

/**
 * Check if a word is dirty data:
 * - Contains Chinese characters, OR
 * - Contains no English letters (only special symbols, numbers, spaces, etc.), OR
 * - Contains special symbols (like parentheses, brackets, etc.)
 */
function isDirtyWord(word: string): boolean {
  const trimmed = word.trim();
  if (!trimmed) return false; // Empty strings are not considered dirty
  
  // Contains Chinese characters
  if (containsChinese(trimmed)) {
    return true;
  }
  
  // Contains no English letters (only special symbols, numbers, spaces, etc.)
  if (!containsEnglish(trimmed)) {
    return true;
  }
  
  // Contains special symbols (like parentheses, brackets, etc.)
  if (containsSpecialSymbols(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Find word cards with dirty data in the word field:
 * - Contains Chinese characters, OR
 * - Contains no English letters (only special symbols, numbers, spaces, etc.), OR
 * - Contains special symbols (like parentheses, brackets, etc.)
 * Returns array of cards that should be cleaned
 */
export async function findWordCardsWithChinese(deckId: string): Promise<Card[]> {
  const allCards = await db.cards
    .where("deckId")
    .equals(deckId)
    .toArray();
  
  const activeCards = allCards.filter((c) => !c.deletedAt && isWordCard(c));
  
  return activeCards.filter((card) => {
    if (isWordCard(card)) {
      return isDirtyWord(card.data.word);
    }
    return false;
  });
}

/**
 * Batch delete word cards that contain Chinese characters in the word field
 * Returns the number of deleted cards
 */
export async function cleanWordCardsWithChinese(deckId: string): Promise<number> {
  const cardsToDelete = await findWordCardsWithChinese(deckId);
  const now = new Date().toISOString();
  
  await Promise.all(
    cardsToDelete.map((card) =>
      db.cards.update(card.id, { deletedAt: now, updatedAt: now })
    )
  );
  
  return cardsToDelete.length;
}

/**
 * Find cards with empty translation
 * Returns array of words/sentences (comma-separated string ready for import)
 */
export async function findCardsWithEmptyTranslation(deckId: string): Promise<string> {
  const allCards = await db.cards
    .where("deckId")
    .equals(deckId)
    .toArray();
  
  const activeCards = allCards.filter((c) => !c.deletedAt);
  
  const items: string[] = [];
  
  for (const card of activeCards) {
    if (isWordCard(card)) {
      const translation = card.data.translation?.trim() || "";
      if (!translation) {
        items.push(card.data.word.trim());
      }
    } else if (isSentenceCard(card)) {
      const translation = card.data.translation?.trim() || "";
      if (!translation) {
        items.push(card.data.sentence.trim());
      }
    }
  }
  
  return items.join(", ");
}
