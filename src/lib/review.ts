import { db } from "./db";
import { scheduler, toFSRSCard, fromFSRSCard, Rating } from "./fsrs";
import { getCard, getCardsByDeck } from "./card";
import type { ReviewRecord } from "@/types";

function generateId() {
  return crypto.randomUUID();
}

export async function recordReview(
  cardId: string,
  rating: 1 | 2 | 3 | 4
): Promise<void> {
  const card = await getCard(cardId);
  if (!card) return;

  const fsrsCard = toFSRSCard(card);
  const grade =
    rating === 1 ? Rating.Again : rating === 2 ? Rating.Hard : rating === 3 ? Rating.Good : Rating.Easy;

  const now = new Date();
  const result = scheduler.next(fsrsCard, now, grade);

  const updates = fromFSRSCard(card, result.card, now);
  await db.cards.update(cardId, updates);

  const record: ReviewRecord = {
    id: generateId(),
    cardId,
    rating,
    reviewedAt: now.toISOString(),
    scheduledDays: result.log.scheduled_days,
  };
  await db.reviewRecords.add(record);
}

export interface GetCardIdsWithLastRatingOptions {
  /** Only include cards whose latest review was within this many days. */
  withinDays?: number;
}

/**
 * Returns card IDs in the deck whose most recent review has the given rating.
 * Rating: 1=Again, 2=Hard, 3=Good, 4=Easy.
 * Optionally restrict to reviews within the past N days (e.g. withinDays: 7).
 */
export async function getCardIdsWithLastRating(
  deckId: string,
  rating: 1 | 2 | 3 | 4,
  options?: GetCardIdsWithLastRatingOptions
): Promise<string[]> {
  const cards = await getCardsByDeck(deckId);
  const cardIds = cards.map((c) => c.id);
  if (cardIds.length === 0) return [];

  const records = await db.reviewRecords
    .where("cardId")
    .anyOf(cardIds)
    .toArray();

  // Group by cardId, keep the record with latest reviewedAt per card
  const latestByCard = new Map<string, ReviewRecord>();
  for (const r of records) {
    const existing = latestByCard.get(r.cardId);
    if (!existing || r.reviewedAt > existing.reviewedAt) {
      latestByCard.set(r.cardId, r);
    }
  }

  const cutoff =
    options?.withinDays != null
      ? new Date(Date.now() - options.withinDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  return [...latestByCard.entries()]
    .filter(([, r]) => {
      if (r.rating !== rating) return false;
      if (cutoff != null && r.reviewedAt < cutoff) return false;
      return true;
    })
    .map(([cardId]) => cardId);
}
