import Dexie, { type Table } from "dexie";
import type { Deck, Card, ReviewRecord } from "@/types";

export class FlashCardDB extends Dexie {
  decks!: Table<Deck>;
  cards!: Table<Card>;
  reviewRecords!: Table<ReviewRecord>;

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
  }
}

export const db = new FlashCardDB();
