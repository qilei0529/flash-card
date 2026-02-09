import { db } from "./db";
import type { Deck } from "@/types";

function generateId() {
  return crypto.randomUUID();
}

export async function getDecks(): Promise<Deck[]> {
  const decks = await db.decks.toArray();
  return decks.filter((d) => !d.deletedAt);
}

export async function createDeck(name: string, language?: string): Promise<Deck> {
  const now = new Date().toISOString();
  const deck: Deck = {
    id: generateId(),
    name,
    createdAt: now,
    updatedAt: now,
    cardsPerSession: 30,
    language,
  };
  await db.decks.add(deck);
  return deck;
}

export async function updateDeck(
  id: string,
  name: string,
  cardsPerSession?: number,
  language?: string
): Promise<void> {
  const deck = await db.decks.get(id);
  if (!deck) return;
  const updateData: Partial<Deck> = {
    name,
    updatedAt: new Date().toISOString(),
  };
  if (cardsPerSession !== undefined) {
    updateData.cardsPerSession = cardsPerSession;
  }
  if (language !== undefined) {
    updateData.language = language;
  }
  await db.decks.update(id, updateData);
}

export async function updateDeckSettings(
  id: string,
  settings: { cardsPerSession?: number; language?: string }
): Promise<void> {
  const deck = await db.decks.get(id);
  if (!deck) return;
  const updateData: Partial<Deck> = {
    updatedAt: new Date().toISOString(),
  };
  if (settings.cardsPerSession !== undefined) {
    updateData.cardsPerSession = settings.cardsPerSession;
  }
  if (settings.language !== undefined) {
    updateData.language = settings.language;
  }
  await db.decks.update(id, updateData);
}

export async function deleteDeck(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.decks.update(id, { deletedAt: now, updatedAt: now });
  const cards = await db.cards.where("deckId").equals(id).toArray();
  for (const card of cards) {
    await db.cards.update(card.id, { deletedAt: now, updatedAt: now });
  }
}
