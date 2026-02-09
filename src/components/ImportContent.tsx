"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileUp, CheckCircle } from "lucide-react";
import { getDecks } from "@/lib/deck";
import { upsertCard } from "@/lib/card";
import { parseImportText } from "@/lib/import";
import type { Deck } from "@/types";

export function ImportContent() {
  const searchParams = useSearchParams();
  const deckIdParam = searchParams.get("deckId");

  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [text, setText] = useState("");
  const [imported, setImported] = useState<number | null>(null);
  const [updated, setUpdated] = useState<number | null>(null);
  const [created, setCreated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (deckIdParam && decks.length > 0 && !selectedDeckId) {
      const exists = decks.some((d) => d.id === deckIdParam);
      if (exists) setSelectedDeckId(deckIdParam);
    }
  }, [deckIdParam, decks, selectedDeckId]);

  async function loadDecks() {
    const list = await getDecks();
    setDecks(list);
    if (list.length > 0 && !selectedDeckId && !deckIdParam) {
      setSelectedDeckId(list[0].id);
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedDeckId) {
      setError("Select a deck");
      return;
    }
    const cards = parseImportText(text);
    if (cards.length === 0) {
      setError(
        "No valid cards found. Use comma or tab separator. 2 columns = sentence type, 3+ columns = word type."
      );
      return;
    }
    
    let updatedCount = 0;
    let createdCount = 0;
    
    for (const c of cards) {
      const result = await upsertCard(selectedDeckId, c.type, c.data);
      if (result.updated) {
        updatedCount++;
      } else {
        createdCount++;
      }
    }
    
    setImported(cards.length);
    setUpdated(updatedCount);
    setCreated(createdCount);
    setText("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setError(null);
    };
    reader.readAsText(file);
  }

  if (decks.length === 0) {
    return (
      <main className="min-h-screen p-6">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <p className="text-gray-500">
            Create a deck first before importing cards.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 hover:underline dark:text-blue-400"
          >
            Go to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href={selectedDeckId ? `/deck/${selectedDeckId}` : "/"}
          className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <h1 className="mb-2 text-2xl font-bold">Import Cards</h1>
        <p className="mb-6 text-gray-500 dark:text-gray-400">
          Paste CSV or Anki plain text (tab-separated). Format:
          <br />
          • 2 columns: sentence, translation (sentence type)
          <br />
          • 3+ columns: word, translation, pronunciation, partOfSpeech, definition, exampleSentence (word type)
        </p>

        {imported !== null && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 py-3 px-4 text-green-800 dark:bg-green-900/30 dark:text-green-200">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <div className="flex flex-col gap-1">
              <span>Imported {imported} cards successfully.</span>
              {updated !== null && created !== null && (
                <span className="text-sm">
                  {created > 0 && `Created ${created} new cards`}
                  {created > 0 && updated > 0 && " · "}
                  {updated > 0 && `Updated ${updated} existing cards`}
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleImport} className="space-y-6">
          <div>
            <label className="mb-2 block font-medium">Target deck</label>
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block font-medium">Card data</label>
            <div className="mb-2 flex gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
                <FileUp className="h-4 w-4" />
                Choose file
                <input
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
                setImported(null);
                setUpdated(null);
                setCreated(null);
              }}
              placeholder={`句子格式 (2列):\nsentence, translation\n\n单词格式 (3+列):\nword, translation, pronunciation, partOfSpeech, definition, exampleSentence`}
              rows={12}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {error && (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
            >
              Import
            </button>
            <Link
              href={selectedDeckId ? `/deck/${selectedDeckId}` : "/"}
              className="rounded-lg border border-gray-300 px-6 py-2 dark:border-gray-600"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
