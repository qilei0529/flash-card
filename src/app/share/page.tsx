"use client";

import Link from "next/link";
import { useState } from "react";

import {
  fetchSharedPackageByCode,
  importSharedPackage,
  type ImportSharedResult,
  type RemoteSharedPackage,
} from "@/lib/shared-import";

export default function ShareImportPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pkg, setPkg] = useState<RemoteSharedPackage | null>(null);
  const [result, setResult] = useState<ImportSharedResult | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setPkg(null);
    setLoading(true);
    try {
      const found = await fetchSharedPackageByCode(code);
      setPkg(found);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Failed to lookup code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!pkg) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const imported = await importSharedPackage(pkg);
      setResult(imported);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Failed to import.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="min-h-screen p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Import shared deck</h1>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
          >
            Back home
          </Link>
        </div>

        <form
          onSubmit={handleLookup}
          className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <label className="block text-sm font-medium">Share code</label>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Enter code"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase dark:border-gray-600 dark:bg-gray-900"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Looking up..." : "Lookup code"}
          </button>
        </form>

        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {pkg ? (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold">{pkg.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              code {pkg.code} · version {pkg.version} · {pkg.cards.length} cards
            </p>
            {pkg.importedVersion ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You last imported version {pkg.importedVersion}.
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You have not imported this package yet.
              </p>
            )}
            <button
              onClick={handleImport}
              disabled={importing}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? "Importing..." : "Import / update"}
            </button>
          </div>
        ) : null}

        {result ? (
          <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200">
            <p>
              {result.status === "created"
                ? "Deck imported."
                : result.status === "updated"
                  ? "Deck updated."
                  : "Deck already up to date."}
            </p>
            <p>
              Created cards: {result.createdCards} · Updated cards: {result.updatedCards}
            </p>
            <Link href={`/deck/${result.deckId}`} className="mt-2 inline-block underline">
              Open deck
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
