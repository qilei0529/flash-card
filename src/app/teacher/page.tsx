"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getCardsByDeck } from "@/lib/card";
import { getDecks } from "@/lib/deck";
import type { Deck } from "@/types";

type MinePackage = {
  id: string;
  code: string;
  name: string;
  language: string | null;
  version: number;
  updatedAt: string;
  cardsCount: number;
};

type PublishResult = {
  packageId: string;
  code: string;
  version: number;
};

export default function TeacherPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [cardsCount, setCardsCount] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<MinePackage[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);

  const selectedDeck = useMemo(
    () => decks.find((deck) => deck.id === selectedDeckId) ?? null,
    [decks, selectedDeckId]
  );

  const loadDecks = useCallback(async () => {
    const list = await getDecks();
    setDecks(list);
    if (!selectedDeckId && list.length > 0) {
      setSelectedDeckId(list[0].id);
    }
  }, [selectedDeckId]);

  const loadCardsCount = useCallback(async (deckId: string) => {
    const cards = await getCardsByDeck(deckId);
    setCardsCount(cards.length);
  }, []);

  const loadMinePackages = useCallback(async () => {
    setLoadingMine(true);
    try {
      const res = await fetch("/api/shared-decks/mine");
      if (!res.ok) return;
      const data = (await res.json()) as { packages?: MinePackage[] };
      setMine(data.packages ?? []);
    } finally {
      setLoadingMine(false);
    }
  }, []);

  useEffect(() => {
    void loadDecks();
    void loadMinePackages();
  }, [loadDecks, loadMinePackages]);

  useEffect(() => {
    if (!selectedDeckId) {
      setCardsCount(0);
      return;
    }
    void loadCardsCount(selectedDeckId);
  }, [loadCardsCount, selectedDeckId]);

  async function handlePublish() {
    if (!selectedDeck) return;
    setError(null);
    setResult(null);
    setPublishing(true);
    try {
      const cards = await getCardsByDeck(selectedDeck.id);
      if (cards.length === 0) {
        setError("Selected deck has no cards.");
        return;
      }

      const existing = mine.find((item) => item.name === selectedDeck.name);
      const payload = {
        code: existing?.code ?? "",
        deck: {
          name: selectedDeck.name,
          language: selectedDeck.language ?? null,
        },
        cards: cards.map((card) => ({
          clientCardId: card.id,
          type: card.type,
          data: card.data,
        })),
      };

      const res = await fetch("/api/shared-decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Failed to publish.");
        return;
      }
      setResult({
        packageId: String(data.packageId),
        code: String(data.code),
        version: Number(data.version),
      });
      await loadMinePackages();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Failed to publish.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <main className="min-h-screen p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Teacher deck package</h1>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
          >
            Back home
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-lg font-semibold">Publish a deck</h2>
          {decks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create a local deck first, then publish it here.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Local deck</label>
                <select
                  value={selectedDeckId}
                  onChange={(event) => setSelectedDeckId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
                >
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Cards to publish: {cardsCount}
              </p>
              <button
                onClick={handlePublish}
                disabled={publishing || !selectedDeckId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publishing ? "Publishing..." : "Publish package"}
              </button>
              {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
              {result ? (
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200">
                  <p>
                    Share code: <span className="font-semibold">{result.code}</span>
                  </p>
                  <p>Version: {result.version}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-lg font-semibold">My published packages</h2>
          {loadingMine ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading packages...</p>
          ) : mine.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No package published yet.</p>
          ) : (
            <ul className="space-y-2">
              {mine.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
                >
                  <p className="font-medium">{item.name}</p>
                  <p className="text-gray-600 dark:text-gray-300">
                    code {item.code} · v{item.version} · {item.cardsCount} cards
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}