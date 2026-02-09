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
