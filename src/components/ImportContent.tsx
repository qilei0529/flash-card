"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileUp, CheckCircle, Loader2 } from "lucide-react";
import { getDecks } from "@/lib/deck";
import { upsertCard, updateCard, findCardByContent } from "@/lib/card";
import { parseImportText, parseWordsOnly } from "@/lib/import";
import type { Deck } from "@/types";

type ImportFormat = "words-only" | "full-csv";

export function ImportContent() {
  const searchParams = useSearchParams();
  const deckIdParam = searchParams.get("deckId");

  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [text, setText] = useState("");
  const [format, setFormat] = useState<ImportFormat>("words-only");
  const [sourceLang, setSourceLang] = useState<string>("English");
  const [imported, setImported] = useState<number | null>(null);
  const [updated, setUpdated] = useState<number | null>(null);
  const [created, setCreated] = useState<number | null>(null);
  const [enriched, setEnriched] = useState<number | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 });
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

    if (format === "words-only") {
      const words = parseWordsOnly(text);
      if (words.length === 0) {
        setError("No valid words found. Use comma, tab, or newline to separate words.");
        return;
      }

      let updatedCount = 0;
      let createdCount = 0;

      for (const word of words) {
        const result = await upsertCard(selectedDeckId, "word", {
          word,
          translation: "",
        });
        if (result.updated) updatedCount++;
        else createdCount++;
      }

      setImported(words.length);
      setUpdated(updatedCount);
      setCreated(createdCount);
      setText("");

      setEnriching(true);
      setEnrichProgress({ current: 0, total: words.length });

      const CHUNK_SIZE = 5;
      const MAX_CONCURRENT = 10;
      const chunks: string[][] = [];
      for (let i = 0; i < words.length; i += CHUNK_SIZE) {
        chunks.push(words.slice(i, i + CHUNK_SIZE));
      }

      let enrichedCount = 0;
      let processedCount = 0;
      let hasError: Error | null = null;

      const processChunk = async (chunk: string[], chunkIndex: number) => {
        if (hasError) return;
        const res = await fetch("/api/word-enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words: chunk, targetLang: "Chinese", sourceLang: sourceLang }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          hasError = new Error(err.error || `Enrich failed: ${res.status}`);
          return;
        }
        const { results } = await res.json();
        for (const r of results || []) {
          const card = await findCardByContent(selectedDeckId, "word", {
            word: r.word,
            translation: "",
          });
          if (card) {
            await updateCard(card.id, {
              data: {
                word: r.word,
                translation: r.translation,
                pronunciation: r.pronunciation,
                partOfSpeech: r.partOfSpeech,
                definition: r.definition,
                exampleSentence: r.exampleSentence,
              },
            });
            enrichedCount++;
          }
        }
        processedCount += chunk.length;
        setEnrichProgress({ current: processedCount, total: words.length });
      };

      try {
        let index = 0;
        const workers = Array.from({ length: Math.min(MAX_CONCURRENT, chunks.length) }, async () => {
          while (index < chunks.length && !hasError) {
            const i = index++;
            await processChunk(chunks[i], i);
          }
        });
        await Promise.all(workers);
        if (hasError) throw hasError;
        setEnriched(enrichedCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Enrich failed");
      } finally {
        setEnriching(false);
      }
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
      if (result.updated) updatedCount++;
      else createdCount++;
    }

    setImported(cards.length);
    setUpdated(updatedCount);
    setCreated(createdCount);
    setEnriched(null);
    setText("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormat("full-csv");
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
          {format === "words-only"
            ? "Paste words separated by comma, tab, or newline. Cards will be enriched with translation, pronunciation, and more via AI."
            : "Paste full CSV or Anki plain text. 2 columns = sentence type, 3+ columns = word type. Word CSV can optionally include a trailing CEFR level column (A1–C2)."}
        </p>

        {(imported !== null || enriching) && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 py-3 px-4 text-green-800 dark:bg-green-900/30 dark:text-green-200">
            {enriching ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
            ) : (
              <CheckCircle className="h-5 w-5 shrink-0" />
            )}
            <div className="flex flex-col gap-1">
              {enriching ? (
                <span>
                  Enriching {enrichProgress.current}/{enrichProgress.total} with AI…
                </span>
              ) : (
                <>
                  <span>Imported {imported} cards successfully.</span>
                  {updated !== null && created !== null && (
                    <span className="text-sm">
                      {created > 0 && `Created ${created} new cards`}
                      {created > 0 && updated > 0 && " · "}
                      {updated > 0 && `Updated ${updated} existing cards`}
                      {enriched !== null && enriched > 0 && ` · Enriched ${enriched} with AI`}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleImport} className="space-y-6">
          <div>
            <label className="mb-2 block font-medium">Import format</label>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="format"
                  checked={format === "words-only"}
                  onChange={() => setFormat("words-only")}
                />
                Words only (AI enrich)
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="format"
                  checked={format === "full-csv"}
                  onChange={() => setFormat("full-csv")}
                />
                Full CSV
              </label>
            </div>
          </div>

          {format === "words-only" && (
            <div>
              <label className="mb-2 block font-medium">Lang</label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="English">English</option>
                <option value="French">French</option>
              </select>
            </div>
          )}

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
                setEnriched(null);
              }}
              placeholder={
                format === "words-only"
                  ? "apple, banana, orange\n\nor:\napple\nbanana\norange"
                  : "2 columns: sentence, translation\n3+ columns: word, translation, pronunciation, partOfSpeech, definition, exampleSentence, level (optional)"
              }
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
              disabled={enriching}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {enriching ? "Importing…" : "Import"}
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
