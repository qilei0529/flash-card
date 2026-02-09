import { db } from "./db";
import { scheduler, toFSRSCard, fromFSRSCard, Rating } from "./fsrs";
import { getCard } from "./card";
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
