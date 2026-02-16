import Dexie, { type Table } from "dexie";
import type { Deck, Card, ReviewRecord, Session } from "@/types";

export class FlashCardDB extends Dexie {
  decks!: Table<Deck>;
  cards!: Table<Card>;
  reviewRecords!: Table<ReviewRecord>;
  sessions!: Table<Session>;

  constructor() {
    super("FlashCardDB");
    this.version(1).stores({
      decks: "id, createdAt, updatedAt",
      cards: "id, deckId, due, createdAt, updatedAt",
      reviewRecords: "id, cardId, reviewedAt, [cardId+reviewedAt]",
    });
    this.version(2)
      .stores({
        decks: "id, createdAt, updatedAt",
        cards: "id, deckId, due, createdAt, updatedAt",
        reviewRecords: "id, cardId, reviewedAt, [cardId+reviewedAt]",
      })
      .upgrade(async (tx) => {
        const cards = await tx.table<Card>("cards").toArray();
        await Promise.all(
          cards.map(async (card) => {
            // 检查是否是旧格式（有 front/back 但没有 type/data）
            if (
              ("front" in card && card.front !== undefined) ||
              ("back" in card && card.back !== undefined)
            ) {
              if (!("type" in card) || !card.type) {
                // 迁移旧卡片为句子类型
                await tx.table<Card>("cards").update(card.id, {
                  type: "sentence",
                  data: {
                    sentence: (card as any).front || "",
                    translation: (card as any).back || "",
                  },
                } as Partial<Card>);
              }
            }
          })
        );
      });
    this.version(3)
      .stores({
        decks: "id, createdAt, updatedAt",
        cards: "id, deckId, due, createdAt, updatedAt",
        reviewRecords: "id, cardId, reviewedAt, [cardId+reviewedAt]",
      })
      .upgrade(async (tx) => {
        // Set default cardsPerSession for existing decks
        const decks = await tx.table<Deck>("decks").toArray();
        await Promise.all(
          decks.map(async (deck) => {
            if (!deck.cardsPerSession) {
              await tx.table<Deck>("decks").update(deck.id, {
                cardsPerSession: 30,
              });
            }
          })
        );
      });
    this.version(4)
      .stores({
        decks: "id, createdAt, updatedAt",
        cards: "id, deckId, due, createdAt, updatedAt",
        reviewRecords: "id, cardId, reviewedAt, [cardId+reviewedAt]",
      })
      .upgrade(async (tx) => {
        // Add language field support (no migration needed, field is optional)
      });
    this.version(5)
      .stores({
        decks: "id, createdAt, updatedAt",
        cards: "id, deckId, due, createdAt, updatedAt",
        reviewRecords: "id, cardId, reviewedAt, [cardId+reviewedAt]",
        sessions: "id, deckId, createdAt, [deckId+createdAt]",
      })
      .upgrade(async (tx) => {
        // Add sessions table (no migration needed for existing data)
      });
    this.version(6)
      .stores({
        decks: "id, createdAt, updatedAt",
        cards: "id, deckId, due, createdAt, updatedAt",
        reviewRecords: "id, cardId, reviewedAt, [cardId+reviewedAt]",
        sessions: "id, deckId, createdAt, [deckId+createdAt]",
      })
      .upgrade(async () => {
        // Add optional levels field on Deck (no migration needed)
      });
    this.version(7)
      .stores({
        decks: "id, createdAt, updatedAt",
        cards: "id, deckId, due, createdAt, updatedAt",
        reviewRecords: "id, cardId, reviewedAt, [cardId+reviewedAt]",
        sessions: "id, deckId, createdAt, [deckId+createdAt]",
      })
      .upgrade(async () => {
        // Add optional durationSeconds on Session (no migration needed)
      });
  }
}

export const db = new FlashCardDB();
