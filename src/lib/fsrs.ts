import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  type Card as FSRSCard,
  type Grade,
} from "ts-fsrs";
import type { Card } from "@/types";

const params = generatorParameters({ enable_fuzz: true });
const scheduler = fsrs(params);

export { Rating, scheduler, createEmptyCard };
export type { Grade };

/** Convert our Card to FSRS Card format */
export function toFSRSCard(c: Card): FSRSCard {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsedDays,
    scheduled_days: c.scheduledDays,
    learning_steps: c.learningSteps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.lastReview ? new Date(c.lastReview) : undefined,
  };
}

/** Convert FSRS Card back to our Card fields (merge with existing) */
export function fromFSRSCard(
  c: Card,
  fsrsCard: FSRSCard,
  lastReview?: Date
): Partial<Card> {
  return {
    due: fsrsCard.due.toISOString(),
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsedDays: fsrsCard.elapsed_days,
    scheduledDays: fsrsCard.scheduled_days,
    learningSteps: fsrsCard.learning_steps,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    state: fsrsCard.state,
    lastReview: lastReview?.toISOString() ?? fsrsCard.last_review?.toISOString() ?? null,
    updatedAt: new Date().toISOString(),
  };
}

/** Get initial FSRS state for a new card */
export function getEmptyCardState(now: Date = new Date()) {
  const empty = createEmptyCard(now);
  return {
    due: empty.due.toISOString(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsedDays: empty.elapsed_days,
    scheduledDays: empty.scheduled_days,
    learningSteps: empty.learning_steps,
    reps: empty.reps,
    lapses: empty.lapses,
    state: empty.state,
    lastReview: null as string | null,
  };
}
