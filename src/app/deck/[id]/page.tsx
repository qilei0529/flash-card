"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Play,
  FileUp,
  Pencil,
  Trash2,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  getCardsByDeck,
  createCard,
  updateCard,
  deleteCard,
  getDueCards,
  isWordCard,
  isSentenceCard,
} from "@/lib/card";
import type { Deck, Card, CardType, WordCardData, SentenceCardData } from "@/types";
import { CardForm } from "@/components/CardForm";

export default function DeckPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  useEffect(() => {
    loadDeck();
    loadCards();
    loadDueCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  async function loadDeck() {
    const d = await db.decks.get(deckId);
    if (!d || d.deletedAt) {
      router.push("/");
      return;
    }
    setDeck(d);
  }

  async function loadCards() {
    const list = await getCardsByDeck(deckId);
    setCards(list);
  }

  async function loadDueCount() {
    const due = await getDueCards(deckId);
    setDueCount(due.length);
  }

  async function handleCreateCard(
    type: CardType,
    data: WordCardData | SentenceCardData
  ) {
    await createCard(deckId, type, data);
    setShowForm(false);
    loadCards();
    loadDueCount();
  }

  async function handleUpdateCard(
    id: string,
    type: CardType,
    data: WordCardData | SentenceCardData
  ) {
    await updateCard(id, { type, data });
    setEditingCard(null);
    loadCards();
  }

  async function handleDeleteCard(id: string) {
    if (!confirm("Delete this card?")) return;
    await deleteCard(id);
    setEditingCard(null);
    loadCards();
    loadDueCount();
  }

  if (!deck) return null;

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to decks
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {cards.length} cards · {dueCount} due
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href={`/deck/${deckId}/review?mode=learning`}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium ${
              dueCount > 0
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400"
            }`}
          >
            <Play className="h-4 w-4" />
            学习模式 {dueCount > 0 && `(${dueCount})`}
          </Link>
          <Link
            href={`/deck/${deckId}/review?mode=test`}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium ${
              dueCount > 0
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400"
            }`}
          >
            <Play className="h-4 w-4" />
            测验模式 {dueCount > 0 && `(${dueCount})`}
          </Link>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Plus className="h-4 w-4" />
            Add card
          </button>
          <Link
            href={`/import?deckId=${deckId}`}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FileUp className="h-4 w-4" />
            Import
          </Link>
        </div>

        {showForm && (
          <CardForm
            onSubmit={handleCreateCard}
            onCancel={() => setShowForm(false)}
          />
        )}

        {editingCard && (
          <CardForm
            initialCard={editingCard}
            onSubmit={(type, data) =>
              handleUpdateCard(editingCard.id, type, data)
            }
            onCancel={() => setEditingCard(null)}
            onDelete={() => handleDeleteCard(editingCard.id)}
          />
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Cards</h2>
          {cards.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              No cards yet. Add one or import from CSV/Anki.
            </p>
          ) : (
            cards.map((card) => (
              <div
                key={card.id}
                className={`flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 ${
                  editingCard?.id === card.id ? "ring-2 ring-blue-500" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                      {card.type === "word" ? "单词" : "句子"}
                    </span>
                  </div>
                  {isWordCard(card) ? (
                    <>
                      <p className="truncate font-medium">{card.data.word}</p>
                      <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                        {card.data.translation}
                      </p>
                    </>
                  ) : isSentenceCard(card) ? (
                    <>
                      <p className="truncate font-medium">
                        {card.data.sentence.length > 50
                          ? `${card.data.sentence.substring(0, 50)}...`
                          : card.data.sentence}
                      </p>
                      <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                        {card.data.translation}
                      </p>
                    </>
                  ) : null}
                </div>
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() =>
                      setEditingCard(editingCard?.id === card.id ? null : card)
                    }
                    className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
