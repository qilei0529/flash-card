"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import type { CardType, WordCardData, SentenceCardData, Card } from "@/types";
import { isWordCard, isSentenceCard } from "@/lib/card";

interface CardFormProps {
  initialCard?: Card;
  onSubmit: (type: CardType, data: WordCardData | SentenceCardData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  /** Optional: target language for AI enrich (e.g. Chinese). Default Chinese. */
  targetLang?: string;
  /** Optional: source language for AI enrich (e.g. English). Default English. */
  sourceLang?: string;
  /** When true, form body scrolls and action buttons stay fixed at bottom (e.g. in modal). */
  stickyActions?: boolean;
}

export function CardForm({
  initialCard,
  onSubmit,
  onCancel,
  onDelete,
  targetLang = "Chinese",
  sourceLang = "English",
  stickyActions = false,
}: CardFormProps) {
  const [type, setType] = useState<CardType>(
    initialCard?.type || "sentence"
  );
  const [fetchingWord, setFetchingWord] = useState(false);
  const [wordData, setWordData] = useState<WordCardData>({
    word: "",
    translation: "",
    pronunciation: "",
    partOfSpeech: "",
    definition: "",
    exampleSentence: "",
  });
  const [sentenceData, setSentenceData] = useState<SentenceCardData>({
    sentence: "",
    translation: "",
  });

  useEffect(() => {
    if (initialCard) {
      setType(initialCard.type);
      if (isWordCard(initialCard)) {
        setWordData(initialCard.data);
      } else if (isSentenceCard(initialCard)) {
        setSentenceData(initialCard.data);
      }
    }
  }, [initialCard]);

  async function handleFetchWordData() {
    const word = wordData.word.trim();
    if (!word) return;
    setFetchingWord(true);
    try {
      const res = await fetch("/api/word-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          words: [word],
          targetLang,
          sourceLang,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Enrich failed: ${res.status}`);
      }
      const { results } = await res.json();
      const first = Array.isArray(results) ? results[0] : null;
      if (first && first.word) {
        setWordData((prev) => ({
          ...prev,
          word: first.word,
          translation: first.translation ?? prev.translation,
          pronunciation: first.pronunciation ?? prev.pronunciation,
          partOfSpeech: first.partOfSpeech ?? prev.partOfSpeech,
          definition: first.definition ?? prev.definition,
          exampleSentence: first.exampleSentence ?? prev.exampleSentence,
        }));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to fetch word data");
    } finally {
      setFetchingWord(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (type === "word") {
      if (!wordData.word.trim() || !wordData.translation.trim()) return;
      const payload: WordCardData = {
        word: wordData.word.trim(),
        translation: wordData.translation.trim(),
        pronunciation: wordData.pronunciation?.trim() || undefined,
        partOfSpeech: wordData.partOfSpeech?.trim() || undefined,
        definition: wordData.definition?.trim() || undefined,
        exampleSentence: wordData.exampleSentence?.trim() || undefined,
        level: wordData.level,
      };
      onSubmit(type, payload);
    } else {
      if (!sentenceData.sentence.trim() || !sentenceData.translation.trim())
        return;
      onSubmit(type, {
        sentence: sentenceData.sentence.trim(),
        translation: sentenceData.translation.trim(),
      });
    }
  }

  const formContent = (
    <div className={stickyActions ? "space-y-4" : "space-y-4"}>
      {!initialCard && (
        <div>
          <label className="mb-1 block text-sm font-medium">卡片类型</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CardType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          >
            <option value="word">单词</option>
            <option value="sentence">句子</option>
          </select>
        </div>
      )}

        {type === "word" ? (
          <>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <label className="text-sm font-medium">
                  单词 <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleFetchWordData}
                  disabled={fetchingWord || !wordData.word.trim()}
                  title="重新获取释义、音标、词性等（与导入时 AI 补全相同）"
                  className="inline-flex items-center gap-1 rounded px-2 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  {fetchingWord ? (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  {fetchingWord ? "获取中…" : "重新获取"}
                </button>
              </div>
              <input
                type="text"
                value={wordData.word}
                onChange={(e) =>
                  setWordData({ ...wordData, word: e.target.value })
                }
                placeholder="单词"
                className="w-full rounded-lg border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                翻译 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={wordData.translation}
                onChange={(e) =>
                  setWordData({ ...wordData, translation: e.target.value })
                }
                placeholder="翻译"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">音标</label>
                <input
                  type="text"
                  value={wordData.pronunciation || ""}
                  onChange={(e) =>
                    setWordData({ ...wordData, pronunciation: e.target.value })
                  }
                  placeholder="音标 / 发音"
                  className="w-full rounded-lg border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">词性</label>
                <input
                  type="text"
                  value={wordData.partOfSpeech || ""}
                  onChange={(e) =>
                    setWordData({ ...wordData, partOfSpeech: e.target.value })
                  }
                  placeholder="noun, verb, adj 等"
                  className="w-full rounded-lg border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">详细释义</label>
              <textarea
                value={wordData.definition || ""}
                onChange={(e) =>
                  setWordData({ ...wordData, definition: e.target.value })
                }
                placeholder="详细释义"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">例句</label>
              <textarea
                value={wordData.exampleSentence || ""}
                onChange={(e) =>
                  setWordData({ ...wordData, exampleSentence: e.target.value })
                }
                placeholder="例句"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">
                句子 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={sentenceData.sentence}
                onChange={(e) =>
                  setSentenceData({ ...sentenceData, sentence: e.target.value })
                }
                placeholder="句子"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                翻译 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={sentenceData.translation}
                onChange={(e) =>
                  setSentenceData({
                    ...sentenceData,
                    translation: e.target.value,
                  })
                }
                placeholder="翻译"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                required
              />
            </div>
          </>
        )}
    </div>
  );

  const actionBar = (
    <div
      className={`flex justify-between ${stickyActions ? " pt-0 dark:border-gray-700" : ""}`}
    >
      <div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            删除
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-2 py-1 dark:border-gray-600"
        >
          取消
        </button>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-2 py-1 text-white hover:bg-blue-700"
        >
          保存
        </button>
      </div>
    </div>
  );

  if (stickyActions) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col rounded-xl bg-white dark:bg-gray-800"
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{formContent}</div>
        <div className="flex-shrink-0 p-4 border-t border-gray-200">{actionBar}</div>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      {formContent}
      {actionBar}
    </form>
  );
}
