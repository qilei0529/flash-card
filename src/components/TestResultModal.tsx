"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getSessionCards, getRatingsForSession } from "@/lib/session";
import { isWordCard, isSentenceCard } from "@/lib/card";
import { PlayButton } from "@/components/PlayButton";
import type { Deck } from "@/types";
import type { Card, WordCardData, SentenceCardData } from "@/types";

const RATING_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "不认识",
  2: "有点难",
  3: "认识",
  4: "熟悉",
};

const RATING_STYLES: Record<1 | 2 | 3 | 4, string> = {
  1: "rounded-full px-2 py-0.5 font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  2: "rounded-full px-2 py-0.5 font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  3: "rounded-full px-2 py-0.5 font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
  4: "rounded-full px-2 py-0.5 font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
};

function WordCardRow({
  card,
  rating,
  deck,
}: {
  card: Card & { type: "word"; data: WordCardData };
  rating: 1 | 2 | 3 | 4 | undefined;
  deck: Deck;
}) {
  const { word, translation, definition, pronunciation, level, exampleSentence } = card.data;
  const ratingLabel = rating !== undefined ? RATING_LABELS[rating] : "—";
  const ratingClassName =
    rating !== undefined ? RATING_STYLES[rating] : "text-gray-400 dark:text-gray-500";
  return (
    <>
      <div className="flex-shrink-0 pt-0.5">
        {deck.language ? (
          <PlayButton
            text={word}
            lang={deck.language}
            tag="word"
            className="rounded-full p-1.5"
          />
        ) : (
          <span className="inline-block h-8 w-8" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium text-gray-900 dark:text-white">
          <span>{word}</span>
          {pronunciation && (
            <span className="text-base font-normal text-gray-500 dark:text-gray-400">
              {pronunciation}
            </span>
          )}
          {level && (
            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
              {level}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-ms text-gray-600 dark:text-gray-400">
          {translation}
        </p>

        {exampleSentence && (
          <p className="mt-1 text-ms text-gray-700 dark:text-gray-300">
            {exampleSentence}
          </p>
        )}
        <p className="mt-2 flex items-center gap-1.5 text-sm">
          <span className="text-gray-500 dark:text-gray-400">测验选择:</span>
          <span className={ratingClassName}>{ratingLabel}</span>
        </p>
      </div>
    </>
  );
}

function SentenceCardRow({
  card,
  rating,
  deck,
}: {
  card: Card & { type: "sentence"; data: SentenceCardData };
  rating: 1 | 2 | 3 | 4 | undefined;
  deck: Deck;
}) {
  const { sentence, translation } = card.data;
  const ratingLabel = rating !== undefined ? RATING_LABELS[rating] : "—";
  const ratingClassName =
    rating !== undefined ? RATING_STYLES[rating] : "text-gray-400 dark:text-gray-500";
  return (
    <>
      <div className="flex-shrink-0 pt-0.5">
        {deck.language ? (
          <PlayButton
            text={sentence}
            lang={deck.language}
            tag="sentence"
            className="rounded-full p-1.5"
          />
        ) : (
          <span className="inline-block h-8 w-8" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 dark:text-white">{sentence}</p>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
          {translation}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          <span className="text-gray-500 dark:text-gray-400">测验选择:</span>
          <span className={ratingClassName}>{ratingLabel}</span>
        </p>
      </div>
    </>
  );
}

export interface TestResultModalProps {
  sessionId: string | null;
  deck: Deck;
  onClose: () => void;
}

export function TestResultModal({
  sessionId,
  deck,
  onClose,
}: TestResultModalProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [ratings, setRatings] = useState<Map<string, 1 | 2 | 3 | 4>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<
    Record<1 | 2 | 3 | 4, boolean>
  >({
    1: false,
    2: false,
    3: false,
    4: false,
  });

  const filteredCards = cards.filter((card) => {
    const r = ratings.get(card.id);
    if (r === undefined) return true;
    const noneChecked = !([1, 2, 3, 4] as const).some((k) => ratingFilter[k]);
    if (noneChecked) return true;
    return ratingFilter[r];
  });

  useEffect(() => {
    if (!sessionId) return;
    setRatingFilter({ 1: false, 2: false, 3: false, 4: false });
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getSessionCards(sessionId),
      getRatingsForSession(sessionId),
    ])
      .then(([sessionCards, sessionRatings]) => {
        if (!cancelled) {
          setCards(sessionCards);
          setRatings(sessionRatings);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="test-result-title"
    >
      <div
        className="absolute inset-0 bg-black/10 dark:bg-black/60"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-shrink-0 flex-col gap-0.5 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2
              id="test-result-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              测验结果
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            本次测验的所有单词及你的选择
          </p>
          {!loading && (
            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-3 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                筛选:
              </span>
              {([1, 2, 3, 4] as const).map((rating) => (
                <label
                  key={rating}
                  className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={ratingFilter[rating]}
                    onChange={(e) =>
                      setRatingFilter((prev) => ({
                        ...prev,
                        [rating]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  {RATING_LABELS[rating]}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              加载中...
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
              无匹配
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredCards.map((card) => {
                const rating = ratings.get(card.id);
                return (
                  <li
                    key={card.id}
                    className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    {isWordCard(card) ? (
                      <WordCardRow
                        card={card}
                        rating={rating}
                        deck={deck}
                      />
                    ) : isSentenceCard(card) ? (
                      <SentenceCardRow
                        card={card}
                        rating={rating}
                        deck={deck}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
