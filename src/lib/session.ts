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
  updates: Partial<Pick<Session, "completedAt" | "completedCards" | "durationSeconds">>
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
export async function completeSession(
  sessionId: string,
  durationSeconds?: number
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  const updates: Parameters<typeof updateSession>[1] = {
    completedAt: new Date().toISOString(),
    completedCards: session.totalCards,
  };
  if (durationSeconds != null) {
    updates.durationSeconds = durationSeconds;
  }
  await updateSession(sessionId, updates);
}

/**
 * Increment completed cards count for a session
 */
export async function incrementSessionProgress(
  sessionId: string,
  durationSeconds?: number
): Promise<void> {
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
    await completeSession(sessionId, durationSeconds);
  }
}

/**
 * Get the rating (1-4) given to each card during a completed session.
 * Infers from reviewRecords where reviewedAt falls within the session window.
 */
export async function getRatingsForSession(
  sessionId: string
): Promise<Map<string, 1 | 2 | 3 | 4>> {
  const session = await getSession(sessionId);
  if (!session?.completedAt || session.cardIds.length === 0) {
    return new Map();
  }

  const records = await db.reviewRecords
    .where("cardId")
    .anyOf(session.cardIds)
    .toArray();

  const endAt = new Date(session.completedAt);
  endAt.setMinutes(endAt.getMinutes() + 5);
  const endAtIso = endAt.toISOString();

  const inWindow = records.filter(
    (r) =>
      r.reviewedAt >= session.createdAt && r.reviewedAt <= endAtIso
  );

  const latestByCard = new Map<string, { rating: 1 | 2 | 3 | 4; reviewedAt: string }>();
  for (const r of inWindow) {
    const existing = latestByCard.get(r.cardId);
    const rating = r.rating as 1 | 2 | 3 | 4;
    if (!existing || r.reviewedAt > existing.reviewedAt) {
      latestByCard.set(r.cardId, { rating, reviewedAt: r.reviewedAt });
    }
  }

  const result = new Map<string, 1 | 2 | 3 | 4>();
  for (const [cardId, { rating }] of latestByCard) {
    result.set(cardId, rating);
  }
  return result;
}
