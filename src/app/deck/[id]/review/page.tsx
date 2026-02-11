"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RotateCcw, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import {
  getDueCards,
  getDueCardsForSession,
  isWordCard,
  isSentenceCard,
} from "@/lib/card";
import { recordReview } from "@/lib/review";
import {
  createSession,
  getSession,
  getSessionCards,
  incrementSessionProgress,
} from "@/lib/session";
import { type PlayButtonHandle } from "@/components/PlayButton";
import { getAudioUrl } from "@/lib/audioCache";
import { LearningCardView, TestCardView } from "@/components/review";
import type { Card, Deck } from "@/types";

type RevealStage = "front" | "sentence" | "translation" | "details" | "rating";
type StudyMode = "learning" | "test";

export default function ReviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const deckId = params.id as string;
  const mode: StudyMode = (searchParams.get("mode") as StudyMode) || "learning";
  const sessionId = searchParams.get("sessionId");

  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [revealStage, setRevealStage] = useState<RevealStage>("front");
  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const playButtonRef1 = useRef<PlayButtonHandle>(null);
  const playButtonRef2 = useRef<PlayButtonHandle>(null);

  useEffect(() => {
    loadDeckAndCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, sessionId]);

  // Keyboard shortcuts: J = reveal/score, U/I/O/P = rate, H = play sound; on done screen: B = back, Enter = again
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("[contenteditable]")
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (cards.length === 0) {
        if (key === "b") {
          e.preventDefault();
          router.push(`/deck/${deckId}`);
          return;
        }
        if (key === "enter") {
          e.preventDefault();
          setSessionCompleted(false);
          router.replace(`/deck/${deckId}/review?mode=${mode}`);
          return;
        }
        return;
      }
      if (key === "j") {
        e.preventDefault();
        if (cards.length > 0 && revealStage !== "rating") {
          handleCardClick();
        }
        return;
      }
      if (key === "h") {
        e.preventDefault();
        const card = cards[index];
        if (card && deck?.language) {
          if (isWordCard(card)) {
            playButtonRef1.current?.play() ?? playButtonRef2.current?.play();
          } else if (isSentenceCard(card)) {
            const text = card.data.sentence;
            if (text) {
              getAudioUrl(text, deck.language, "sentence").then((url) => {
                const audio = new Audio(url);
                audio.play().catch(() => { });
              });
            }
          }
        }
        return;
      }
      if (revealStage === "rating") {
        if (key === "u") {
          e.preventDefault();
          handleRate(1);
        } else if (key === "i") {
          e.preventDefault();
          handleRate(2);
        } else if (key === "o") {
          e.preventDefault();
          handleRate(3);
        } else if (key === "p") {
          e.preventDefault();
          handleRate(4);
        }
        return;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cards, index, revealStage, deck?.language, deckId, mode, router]);

  async function loadDeckAndCards() {
    const d = await db.decks.get(deckId);
    if (!d) {
      setLoading(false);
      return;
    }

    setDeck(d);

    // If sessionId exists, load cards from session and resume at saved progress
    if (sessionId) {
      const [session, sessionCards] = await Promise.all([
        getSession(sessionId),
        getSessionCards(sessionId),
      ]);
      if (session && sessionCards.length > 0) {
        setCards(sessionCards);
        setCurrentSessionId(sessionId);
        // Resume at the next card to review (completedCards = number already done)
        const resumeIndex = Math.min(
          session.completedCards,
          Math.max(0, sessionCards.length - 1)
        );
        setIndex(resumeIndex);
        setRevealStage("front");
        setLoading(false);
        return;
      }
      // If session doesn't exist or has no cards, fall through to create new session
    }

    // No sessionId or session invalid - create new session
    const limit = d.cardsPerSession || 30;
    const due = await getDueCardsForSession(deckId, limit, d.levels);

    if (due.length === 0) {
      setCards([]);
      setLoading(false);
      return;
    }

    // Create new session with selected cards
    const cardIds = due.map((card) => card.id);
    const session = await createSession(deckId, mode, cardIds);

    // Redirect to same URL with sessionId
    const newUrl = `/deck/${deckId}/review?mode=${mode}&sessionId=${session.id}`;
    router.replace(newUrl);
    setCurrentSessionId(session.id);
    setCards(due);
    setIndex(0);
    setRevealStage("front");
    setLoading(false);
  }

  async function loadCards() {
    if (!deck) return;
    const limit = deck.cardsPerSession || 30;
    const due = await getDueCardsForSession(deckId, limit, deck.levels);
    setCards(due);
    setIndex(0);
    setRevealStage("front");
  }

  function handleCardClick() {
    const card = cards[index];
    if (!card) return;

    if (revealStage === "front") {
      if (mode === "learning" && isWordCard(card)) {
        setRevealStage(card.data.exampleSentence ? "sentence" : "rating");
      } else {
        setRevealStage("rating");
      }
    } else if (revealStage === "sentence") {
      setRevealStage("rating");
    } else if (revealStage === "translation" || revealStage === "details") {
      setRevealStage("rating");
    }
  }

  async function handleRate(rating: 1 | 2 | 3 | 4) {
    const card = cards[index];
    if (!card) return;

    await recordReview(card.id, rating);

    // Update session progress
    if (currentSessionId) {
      await incrementSessionProgress(currentSessionId);
    }

    setRevealStage("front");

    if (index < cards.length - 1) {
      setIndex(index + 1);
    } else {
      setSessionCompleted(true);
      setCards([]);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  function handleStartAgain() {
    setSessionCompleted(false);
    router.replace(`/deck/${deckId}/review?mode=${mode}`);
  }

  if (cards.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-8">
        <div className="mx-auto w-full max-w-sm rounded-3xl border-2 border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800 text-center">
          {sessionCompleted ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                完成
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                恭喜完成本轮复习
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                暂无待复习
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                当前没有需要复习的卡片
              </p>
            </>
          )}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/deck/${deckId}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
              <kbd className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[10px] dark:bg-gray-600">B</kbd>
            </Link>
            <button
              type="button"
              onClick={handleStartAgain}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <RotateCcw className="h-4 w-4" />
              再来
              <kbd className="ml-1 rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
            </button>
          </div>
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

        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-row items-center gap-2">
            <Link
              href={`/deck/${deckId}`}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mr-4"
            >
              <button type="button" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mr-4">
              <ArrowLeft className="h-4 w-4" />
              Back
              </button>
            </Link>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${mode === "learning"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
                }`}
            >
              {mode === "learning" ? "学习模式" : "测验模式"}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {index + 1} of {cards.length}
          </p>
        </div>

        <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full transition-all duration-300 ${mode === "learning" ? "bg-blue-600" : "bg-purple-600"
              }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {mode === "learning" && (
          <LearningCardView
            card={card}
            deck={deck}
            revealStage={revealStage}
            isWord={isWord}
            playButtonRef={playButtonRef1}
            onCardClick={handleCardClick}
          />
        )}
        {mode === "test" && (
          <TestCardView
            card={card}
            deck={deck}
            revealStage={revealStage}
            isWord={isWord}
            playButtonRef={playButtonRef2}
            onCardClick={handleCardClick}
          />
        )}

        {/* Rating buttons - fixed height container to prevent layout shift */}
        <div className="mt-8 flex flex-col items-center">
          {revealStage === "rating" && (
            <>
              <div className="flex flex-wrap justify-center items-center gap-3">
                <button
                  onClick={() => handleRate(1)}
                  className="flex flex-col items-center gap rounded-2xl bg-red-500 px-4 py-3 pb-1 text-sm font-medium text-white hover:bg-red-600"
                >
                  <span className="font-semibold">不认识</span>
                  <kbd className="text-[12px] font-mono font-semibold">U</kbd>
                </button>
                <button
                  onClick={() => handleRate(2)}
                  className="flex flex-col items-center gap rounded-2xl bg-amber-500 px-4 py-3 pb-1 text-sm font-medium text-white hover:bg-amber-600"
                >
                  <span className="font-semibold">有点难</span>
                  <kbd className="text-[12px] font-mono font-semibold">I</kbd>
                </button>
                <button
                  onClick={() => handleRate(3)}
                  className="flex flex-col items-center gap rounded-2xl bg-green-500 px-4 py-3 pb-1 text-sm font-medium text-white hover:bg-green-600"
                >
                  <span className="font-semibold">认识</span>
                  <kbd className="text-[12px] font-mono font-semibold">O</kbd>
                </button>
                <button
                  onClick={() => handleRate(4)}
                  className="flex flex-col items-center gap rounded-2xl bg-emerald-600 px-4 py-3 pb-1 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <span className="font-semibold">熟悉</span>
                  <kbd className="text-[12px] font-mono font-semibold opacity-80">P</kbd>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
