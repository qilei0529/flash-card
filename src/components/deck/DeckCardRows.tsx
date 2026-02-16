"use client";

import { Pencil, Trash2 } from "lucide-react";
import { PlayButton } from "@/components/PlayButton";
import type { Deck } from "@/types";
import type { Card, WordCardData, SentenceCardData } from "@/types";

export type ProficiencyBadge = { label: string; className: string };

export interface DeckCardRowProps {
  card: Card;
  deck: Deck | null;
  editingCard: Card | null;
  getProficiencyBadge: (card: Card) => ProficiencyBadge;
  onEdit: (card: Card | null) => void;
  onDelete: (cardId: string) => void;
}

function Badges({
  card,
  getProficiencyBadge,
  typeLabel,
  level,
}: {
  card: Card;
  getProficiencyBadge: (card: Card) => ProficiencyBadge;
  typeLabel: string;
  level?: string;
}) {
  const badge = getProficiencyBadge(card);
  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
        {typeLabel}
      </span>
      <span
        className={`rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}
      >
        {badge.label}
      </span>
      {level && (
        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
          {level}
        </span>
      )}
    </div>
  );
}

function RowActions({
  card,
  editingCard,
  onEdit,
  onDelete,
}: {
  card: Card;
  editingCard: Card | null;
  onEdit: (card: Card | null) => void;
  onDelete: (cardId: string) => void;
}) {
  return (
    <div className="ml-4 flex gap-2">
      <button
        onClick={() => onEdit(editingCard?.id === card.id ? null : card)}
        className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={() => onDelete(card.id)}
        className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function DeckWordCardRow({
  card,
  deck,
  editingCard,
  getProficiencyBadge,
  onEdit,
  onDelete,
}: DeckCardRowProps & {
  card: Card & { type: "word"; data: WordCardData };
}) {
  const { word, translation, pronunciation, exampleSentence, level } =
    card.data;
  const lang = deck?.language ?? "English";

  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 ${
        editingCard?.id === card.id ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {word.trim() ? (
          <PlayButton text={word} lang={lang} tag="word" className="shrink-0" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 truncate font-medium">
            <span>{word}</span>
            {pronunciation && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                {pronunciation}
              </span>
            )}
          </p>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
            {translation}
          </p>
          {exampleSentence && (
            <p className="mt-1 mb-2 truncate text-sm text-gray-600 dark:text-gray-300">
              {exampleSentence}
            </p>
          )}

<Badges
            card={card}
            getProficiencyBadge={getProficiencyBadge}
            typeLabel="单词"
            level={level}
          />
        </div>
      </div>
      <RowActions
        card={card}
        editingCard={editingCard}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

export function DeckSentenceCardRow({
  card,
  deck,
  editingCard,
  getProficiencyBadge,
  onEdit,
  onDelete,
}: DeckCardRowProps & {
  card: Card & { type: "sentence"; data: SentenceCardData };
}) {
  const { sentence, translation } = card.data;
  const lang = deck?.language ?? "English";
  const displaySentence =
    sentence.length > 50 ? `${sentence.substring(0, 50)}...` : sentence;

  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 ${
        editingCard?.id === card.id ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {sentence.trim() ? (
          <PlayButton
            text={sentence}
            lang={lang}
            tag="sentence"
            className="shrink-0"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <Badges
            card={card}
            getProficiencyBadge={getProficiencyBadge}
            typeLabel="句子"
          />
          <p className="truncate font-medium">{displaySentence}</p>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
            {translation}
          </p>
        </div>
      </div>
      <RowActions
        card={card}
        editingCard={editingCard}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
