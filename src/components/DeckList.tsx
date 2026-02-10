"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderOpen, Trash2, Pencil } from "lucide-react";
import { getDecks, createDeck, updateDeck, deleteDeck } from "@/lib/deck";
import { ensureDemoDeck } from "@/lib/demoDeck";
import type { Deck } from "@/types";
import { db } from "@/lib/db";

export function DeckList() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function loadDecks() {
    let list = await getDecks();
    if (list.length === 0) {
      await ensureDemoDeck();
      list = await getDecks();
    }
    setDecks(list);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void loadDecks();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createDeck(newName.trim());
    setNewName("");
    setShowForm(false);
    loadDecks();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this deck and all its cards?")) return;
    await deleteDeck(id);
    loadDecks();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Flash Cards</h1>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add deck
          </button>
        ) : (
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Deck name"
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setNewName("");
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {decks.length === 0 && !showForm ? (
        <p className="text-gray-500 dark:text-gray-400">
          No decks yet. Create one to get started.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onRename={(name) => {
                updateDeck(deck.id, name).then(loadDecks);
              }}
              onDelete={() => handleDelete(deck.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeckCard({
  deck,
  onRename,
  onDelete,
}: {
  deck: Deck;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [cardCount, setCardCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(deck.name);

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = editName.trim();
    if (trimmed && trimmed !== deck.name) {
      onRename(trimmed);
    }
    setEditing(false);
    setEditName(deck.name);
  }

  useEffect(() => {
    async function load() {
      const cards = await db.cards.where("deckId").equals(deck.id).toArray();
      const active = cards.filter((c) => !c.deletedAt);
      setCardCount(active.length);
      const now = new Date().toISOString();
      setDueCount(active.filter((c) => c.due <= now).length);
    }
    load();
  }, [deck.id]);

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <Link
        href={`/deck/${deck.id}`}
        className="flex flex-1 items-center gap-3"
      >
        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
          <FolderOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <form onSubmit={handleRename} onClick={(e) => e.preventDefault()}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRename}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                autoFocus
              />
            </form>
          ) : (
            <h2 className="font-semibold">{deck.name}</h2>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {cardCount} cards · {dueCount} due
          </p>
        </div>
      </Link>
      <div className="flex gap-1">
        <button
          onClick={(e) => {
            e.preventDefault();
            setEditing(true);
            setEditName(deck.name);
          }}
          className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="Rename deck"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
          className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          title="Delete deck"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
