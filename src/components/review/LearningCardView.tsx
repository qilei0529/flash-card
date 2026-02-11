"use client";

import { type RefObject } from "react";
import { PlayButton, type PlayButtonHandle } from "@/components/PlayButton";
import { isWordCard, isSentenceCard } from "@/lib/card";
import type { Card, Deck } from "@/types";

export type LearningRevealStage =
  | "front"
  | "sentence"
  | "translation"
  | "details"
  | "rating";

export interface LearningCardViewProps {
  card: Card;
  deck: Deck | null;
  revealStage: LearningRevealStage;
  isWord: boolean;
  playButtonRef: RefObject<PlayButtonHandle | null>;
  onCardClick?: () => void;
}

/**
 * Learning mode card view: front (word/sentence) → optional sentence → translation + rating.
 * Includes the card wrapper. Open this file to view or edit the learning flow only.
 */
export function LearningCardView({
  card,
  deck,
  revealStage,
  isWord,
  playButtonRef,
  onCardClick,
}: LearningCardViewProps) {
  const isRating = revealStage === "rating";

  return (
    <>
    <div
      className={`flex-1 w-full max-w-[360px] min-h-[280px] mx-auto select-none rounded-2xl border-2 border-gray-200 bg-white p-8 pt-4 pb-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 flex flex-col items-center justify-center ${
        isRating ? "max-h-[420px] overflow-y-auto" : "max-h-[280px]"
      } ${!isRating ? "cursor-pointer" : ""}`}
      onClick={!isRating ? onCardClick : undefined}
    >
      {revealStage === "front" && (
        <div className="text-center w-full">
          <div className="mb-2 flex items-center justify-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>{isWord ? "单词" : "句子"}</span>
            {isWordCard(card) && card.data.level && (
              <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 -mr-8">
                {card.data.level}
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap text-3xl leading-relaxed">
            {isWordCard(card)
              ? card.data.word
              : isSentenceCard(card)
                ? card.data.sentence
                : ""}
          </p>
          {isWordCard(card) && card.data.pronunciation && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <p className="text-xl text-gray-400 dark:text-gray-500">
                {card.data.pronunciation}
              </p>
              {deck?.language && (
                <span className="-mr-8">
                  <PlayButton
                    ref={playButtonRef}
                    text={card.data.word}
                    lang={deck.language}
                    tag="word"
                  />
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {revealStage === "sentence" && isWordCard(card) && (
        <div className="text-center w-full">
          <div className="mb-2 flex items-center justify-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>单词</span>
            {card.data.level && (
              <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 -mr-8">
                {card.data.level}
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap text-3xl leading-relaxed mb-2">
            {card.data.word}
          </p>
          {card.data.pronunciation && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <p className="text-xl text-gray-400 dark:text-gray-500">
                {card.data.pronunciation}
              </p>
              {deck?.language && (
                <span className="-mr-8">
                  <PlayButton
                    ref={playButtonRef}
                    text={card.data.word}
                    lang={deck.language}
                    tag="word"
                  />
                </span>
              )}
            </div>
          )}
          {card.data.exampleSentence && (
            <div className="border-gray-200 pt-4 dark:border-gray-700">
              <p className="whitespace-pre-wrap text-xl text-gray-700 dark:text-gray-300 ">
                {card.data.exampleSentence}
              </p>
            </div>
          )}
        </div>
      )}

      {(revealStage === "translation" ||
        revealStage === "details" ||
        revealStage === "rating") && (
        <div className="text-center w-full">
          <div className="mb-2 flex items-center justify-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>{isWord ? "单词" : "句子"}</span>
            {isWordCard(card) && card.data.level && (
              <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 -mr-8">
                {card.data.level}
              </span>
            )}
          </div>
          <p
            className={`whitespace-pre-wrap text-3xl leading-relaxed ${
              isWordCard(card) && card.data.pronunciation ? "mb-2" : "mb-4"
            }`}
          >
            {isWordCard(card)
              ? card.data.word
              : isSentenceCard(card)
                ? card.data.sentence
                : ""}
          </p>
          {isWordCard(card) && card.data.pronunciation && (
            <div className="mb-2 flex items-center justify-center gap-2">
              <p className="text-xl text-gray-400 dark:text-gray-500">
                {card.data.pronunciation}
              </p>
              {deck?.language && (
                <span className="-mr-8">
                  <PlayButton
                    ref={playButtonRef}
                    text={card.data.word}
                    lang={deck.language}
                    tag="word"
                  />
                </span>
              )}
            </div>
          )}
          {revealStage === "rating" &&
            isWordCard(card) &&
            card.data.exampleSentence && (
              <div className="dark:border-gray-700">
                <p className="whitespace-pre-wrap text-ms text-gray-700 dark:text-gray-300">
                  {card.data.exampleSentence}
                </p>
              </div>
            )}
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              翻译
            </div>
            <p className="whitespace-pre-wrap text-2xl text-gray-700 dark:text-gray-300">
              {card.data.translation}
            </p>
            {revealStage === "rating" &&
              isWordCard(card) &&
              card.data.definition && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    详细释义
                  </div>
                  <p className="whitespace-pre-wrap text-ms text-gray-700 dark:text-gray-300">
                    {card.data.definition}
                  </p>
                </div>
              )}
          </div>
        </div>
      )}

    </div>

    {revealStage === "front" && (
        <div className="mt-4 h-5 flex items-center justify-center">
          <p className="text-sm text-gray-400">
            {isWordCard(card) ? "点击显示例句" : "点击显示翻译"}
          </p>
        </div>)}
      {/* Hint */}
      <div className="mt-4 h-5 flex items-center justify-center">
        {revealStage === "front" && (
          <p className="text-sm text-gray-400 text-center">
            点击或按{" "}
            <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-600">
              J
            </kbd>
            {isWordCard(card) ? " 显示例句" : " 显示翻译与评分"}
            {" · "}
            <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-600">
              H
            </kbd>{" "}
            播放
          </p>
        )}
        {revealStage === "sentence" && (
          <p className="text-sm text-gray-400 text-center">
            点击或按{" "}
            <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-600">
              J
            </kbd>{" "}
            显示翻译与释义 ·{" "}
            <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-600">
              H
            </kbd>{" "}
            播放
          </p>
        )}
      </div>
    </>
  );
}
