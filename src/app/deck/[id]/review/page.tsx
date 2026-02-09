"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import {
  getDueCards,
  getDueCardsForSession,
  isWordCard,
  isSentenceCard,
} from "@/lib/card";
import { recordReview } from "@/lib/review";
import type { Card, Deck } from "@/types";

type RevealStage = "front" | "translation" | "details" | "rating";
type StudyMode = "learning" | "test";

export default function ReviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const deckId = params.id as string;
  const mode: StudyMode = (searchParams.get("mode") as StudyMode) || "learning";

  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [revealStage, setRevealStage] = useState<RevealStage>("front");
  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<Deck | null>(null);

  useEffect(() => {
    loadDeckAndCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  async function loadDeckAndCards() {
    const d = await db.decks.get(deckId);
    if (d) {
      setDeck(d);
      const limit = d.cardsPerSession || 30;
      const due = await getDueCardsForSession(deckId, limit);
      setCards(due);
      setIndex(0);
      setRevealStage("front");
      setLoading(false);
    } else {
      setLoading(false);
    }
  }

  async function loadCards() {
    if (!deck) return;
    const limit = deck.cardsPerSession || 30;
    const due = await getDueCardsForSession(deckId, limit);
    setCards(due);
    setIndex(0);
    setRevealStage("front");
  }

  function handleCardClick() {
    const card = cards[index];
    if (!card) return;

    if (revealStage === "front") {
      setRevealStage("translation");
    } else if (revealStage === "translation") {
      if (isWordCard(card)) {
        // 单词类型：显示详细信息
        setRevealStage("details");
      } else {
        // 句子类型：直接显示评分
        setRevealStage("rating");
      }
    } else if (revealStage === "details") {
      // 单词类型：显示评分
      setRevealStage("rating");
    }
  }

  async function handleRate(rating: 1 | 2 | 3 | 4) {
    const card = cards[index];
    if (!card) return;

    await recordReview(card.id, rating);
    setRevealStage("front");

    if (index < cards.length - 1) {
      setIndex(index + 1);
    } else {
      // Load new batch of cards for the session
      if (!deck) return;
      const limit = deck.cardsPerSession || 30;
      const remaining = await getDueCardsForSession(deckId, limit);
      if (remaining.length > 0) {
        setCards(remaining);
        setIndex(0);
      } else {
        setCards([]);
      }
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  if (cards.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">No cards due</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Great job! You have no cards to review right now.
          </p>
          <Link
            href={`/deck/${deckId}`}
            className="mt-6 inline-flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to deck
          </Link>
        </div>
      </main>
    );
  }

  const card = cards[index];
  const progress = ((index + 1) / cards.length) * 100;
  const isWord = isWordCard(card);

  return (
    <main className="flex min-h-screen flex-col p-6 sm:p-8">
      <div className="mx-auto w-full max-w-2xl flex-1 flex flex-col">
        <Link
          href={`/deck/${deckId}`}
          className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit review
        </Link>

        <div className="mb-4 flex items-center justify-between">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              mode === "learning"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
            }`}
          >
            {mode === "learning" ? "学习模式" : "测验模式"}
          </span>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {index + 1} of {cards.length}
          </p>
        </div>

        <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full transition-all duration-300 ${
              mode === "learning" ? "bg-blue-600" : "bg-purple-600"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div
          className={`flex-1 select-none rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800 flex flex-col items-center justify-center ${
            revealStage !== "rating" ? "cursor-pointer" : ""
          }`}
          onClick={revealStage !== "rating" ? handleCardClick : undefined}
        >
          {/* Front */}
          {revealStage === "front" && (
            <div className="text-center w-full">
              <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                {mode === "learning"
                  ? isWord
                    ? "单词"
                    : "句子"
                  : "翻译"}
              </div>
              <p className="whitespace-pre-wrap text-3xl leading-relaxed">
                {mode === "learning"
                  ? isWordCard(card)
                    ? card.data.word
                    : isSentenceCard(card)
                      ? card.data.sentence
                      : ""
                  : card.data.translation}
              </p>
              <div className="mt-4 h-5 flex items-center justify-center">
                <p className="text-sm text-gray-400">
                  {mode === "learning" ? "点击显示翻译" : "点击显示答案"}
                </p>
              </div>
            </div>
          )}

          {/* Translation/Answer */}
          {(revealStage === "translation" ||
            revealStage === "details" ||
            revealStage === "rating") && (
            <div className="text-center w-full">
              <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                {mode === "learning"
                  ? isWord
                    ? "单词"
                    : "句子"
                  : "翻译"}
              </div>
              <p className="mb-4 whitespace-pre-wrap text-3xl leading-relaxed">
                {mode === "learning"
                  ? isWordCard(card)
                    ? card.data.word
                    : isSentenceCard(card)
                      ? card.data.sentence
                      : ""
                  : card.data.translation}
              </p>
              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {mode === "learning" ? "翻译" : "答案"}
                </div>
                <p className="whitespace-pre-wrap text-2xl text-gray-700 dark:text-gray-300">
                  {mode === "learning"
                    ? card.data.translation
                    : isWordCard(card)
                      ? card.data.word
                      : isSentenceCard(card)
                        ? card.data.sentence
                        : ""}
                </p>
              </div>
            </div>
          )}

          {/* Details (word only) */}
          {isWordCard(card) &&
            (revealStage === "details" || revealStage === "rating") && (
              <div className="mt-6 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700 text-center w-full">
                {card.data.pronunciation && (
                  <div>
                    <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      音标
                    </div>
                    <p className="text-xl">{card.data.pronunciation}</p>
                  </div>
                )}
                {card.data.partOfSpeech && (
                  <div>
                    <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      词性
                    </div>
                    <p className="text-xl">{card.data.partOfSpeech}</p>
                  </div>
                )}
                {card.data.definition && (
                  <div>
                    <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      详细释义
                    </div>
                    <p className="whitespace-pre-wrap text-xl">
                      {card.data.definition}
                    </p>
                  </div>
                )}
                {card.data.exampleSentence && (
                  <div>
                    <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      例句
                    </div>
                    <p className="whitespace-pre-wrap text-xl italic">
                      {card.data.exampleSentence}
                    </p>
                  </div>
                )}
              </div>
            )}

          {/* Hint text - fixed height container to prevent layout shift */}
          <div className="mt-4 h-5 flex items-center justify-center">
            {revealStage === "translation" && (
              <p className="text-sm text-gray-400 text-center">
                {isWord ? "点击显示详细信息" : "点击显示评分"}
              </p>
            )}
            {revealStage === "details" && (
              <p className="text-sm text-gray-400 text-center">点击显示评分</p>
            )}
          </div>
        </div>

        {/* Rating buttons - fixed height container to prevent layout shift */}
        <div className="mt-8 h-16 flex flex-wrap justify-center items-center gap-3">
          {revealStage === "rating" && (
            <>
              <button
                onClick={() => handleRate(1)}
                className="rounded-lg bg-red-500 px-4 py-3 font-medium text-white hover:bg-red-600"
              >
                Again
              </button>
              <button
                onClick={() => handleRate(2)}
                className="rounded-lg bg-amber-500 px-4 py-3 font-medium text-white hover:bg-amber-600"
              >
                Hard
              </button>
              <button
                onClick={() => handleRate(3)}
                className="rounded-lg bg-green-500 px-4 py-3 font-medium text-white hover:bg-green-600"
              >
                Good
              </button>
              <button
                onClick={() => handleRate(4)}
                className="rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700"
              >
                Easy
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
