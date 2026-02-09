"use client";

import { useState, useEffect } from "react";
import type { CardType, WordCardData, SentenceCardData, Card } from "@/types";
import { isWordCard, isSentenceCard } from "@/lib/card";

interface CardFormProps {
  initialCard?: Card;
  onSubmit: (type: CardType, data: WordCardData | SentenceCardData) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function CardForm({
  initialCard,
  onSubmit,
  onCancel,
  onDelete,
}: CardFormProps) {
  const [type, setType] = useState<CardType>(
    initialCard?.type || "sentence"
  );
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (type === "word") {
      if (!wordData.word.trim() || !wordData.translation.trim()) return;
      onSubmit(type, {
        word: wordData.word.trim(),
        translation: wordData.translation.trim(),
        pronunciation: wordData.pronunciation?.trim() || undefined,
        partOfSpeech: wordData.partOfSpeech?.trim() || undefined,
        definition: wordData.definition?.trim() || undefined,
        exampleSentence: wordData.exampleSentence?.trim() || undefined,
      });
    } else {
      if (!sentenceData.sentence.trim() || !sentenceData.translation.trim())
        return;
      onSubmit(type, {
        sentence: sentenceData.sentence.trim(),
        translation: sentenceData.translation.trim(),
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">卡片类型</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CardType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            disabled={!!initialCard}
          >
            <option value="word">单词</option>
            <option value="sentence">句子</option>
          </select>
        </div>

        {type === "word" ? (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">
                单词 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={wordData.word}
                onChange={(e) =>
                  setWordData({ ...wordData, word: e.target.value })
                }
                placeholder="单词"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">音标</label>
              <input
                type="text"
                value={wordData.pronunciation || ""}
                onChange={(e) =>
                  setWordData({ ...wordData, pronunciation: e.target.value })
                }
                placeholder="音标 / 发音"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">词性</label>
              <input
                type="text"
                value={wordData.partOfSpeech || ""}
                onChange={(e) =>
                  setWordData({ ...wordData, partOfSpeech: e.target.value })
                }
                placeholder="noun, verb, adj 等"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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

        <div className="flex justify-between">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
