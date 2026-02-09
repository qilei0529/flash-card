import { db } from "./db";
import { getCard } from "./card";
import type { Session, SessionMode, Card } from "@/types";

function generateId() {
  return crypto.randomUUID();
}

/**
 * Create a new session with the given cards
 */
export async function createSession(
  deckId: string,
  mode: SessionMode,
  cardIds: string[]
): Promise<Session> {
  const now = new Date().toISOString();
  const session: Session = {
    id: generateId(),
    deckId,
    mode,
    cardIds,
    createdAt: now,
    completedAt: null,
    totalCards: cardIds.length,
    completedCards: 0,
  };
  await db.sessions.add(session);
  return session;
}

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<Session | undefined> {
  return db.sessions.get(sessionId);
}

/**
 * Get all sessions for a deck, ordered by creation date (newest first)
 */
export async function getSessionsByDeck(deckId: string): Promise<Session[]> {
  const sessions = await db.sessions
    .where("deckId")
    .equals(deckId)
    .sortBy("createdAt");

  // Newest first
  return sessions.reverse();
}

/**
 * Update a session
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<Pick<Session, "completedAt" | "completedCards">>
): Promise<void> {
  await db.sessions.update(sessionId, updates);
}

/**
 * Get cards for a session in the saved order
 */
export async function getSessionCards(sessionId: string): Promise<Card[]> {
  const session = await getSession(sessionId);
  if (!session) return [];

  const cards: Card[] = [];
  for (const cardId of session.cardIds) {
    const card = await getCard(cardId);
    if (card && !card.deletedAt) {
      cards.push(card);
    }
  }
  return cards;
}

/**
 * Mark a session as completed
 */
export async function completeSession(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  await updateSession(sessionId, {
    completedAt: new Date().toISOString(),
    completedCards: session.totalCards,
  });
}

/**
 * Increment completed cards count for a session
 */
export async function incrementSessionProgress(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  const newCompletedCards = Math.min(
    session.completedCards + 1,
    session.totalCards
  );

  await updateSession(sessionId, {
    completedCards: newCompletedCards,
  });

  // Auto-complete if all cards are done
  if (newCompletedCards >= session.totalCards && !session.completedAt) {
    await completeSession(sessionId);
  }
}
