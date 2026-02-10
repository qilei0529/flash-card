"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Play,
  FileUp,
  FileDown,
  Pencil,
  Trash2,
  Settings,
  History,
  Filter,
  Search,
  Wand2,
  ClipboardList,
  ChevronDown,
  Gauge,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  getCardsByDeck,
  createCard,
  updateCard,
  deleteCard,
  getDueCards,
  isWordCard,
  isSentenceCard,
  findWordCardsWithChinese,
  cleanWordCardsWithChinese,
  findCardsWithEmptyTranslation,
} from "@/lib/card";
import { updateDeckSettings } from "@/lib/deck";
import type {
  Deck,
  Card,
  CardType,
  WordCardData,
  SentenceCardData,
  CefrLevel,
} from "@/types";
import { CardForm } from "@/components/CardForm";
import { cardsToCSV, downloadCSV } from "@/lib/export/csv";
import { getCardIdsWithLastRating } from "@/lib/review";

export default function DeckPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [deckName, setDeckName] = useState<string>("");
  const [cardsPerSession, setCardsPerSession] = useState<number>(30);
  const [language, setLanguage] = useState<string>("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [proficiencyFilter, setProficiencyFilter] = useState<number | "all">("all");
  const [lastRatingFilter, setLastRatingFilter] = useState<"all" | "again">("all");
  const [againCardIds, setAgainCardIds] = useState<Set<string> | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | CefrLevel>("all");
  const [levelFilling, setLevelFilling] = useState(false);
  const [levelProgress, setLevelProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });

  useEffect(() => {
    loadDeck();
    loadCards();
    loadDueCount();
    loadAgainCardIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // Keyboard shortcuts: N = 学习 (learning), M = 测验 (test)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isInput) return;

      const key = e.key.toLowerCase();
      if (key === "n") {
        e.preventDefault();
        if (dueCount > 0) router.push(`/deck/${deckId}/review?mode=learning`);
      } else if (key === "m") {
        e.preventDefault();
        if (dueCount > 0) router.push(`/deck/${deckId}/review?mode=test`);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deckId, dueCount, router]);

  async function loadAgainCardIds() {
    const ids = await getCardIdsWithLastRating(deckId, 1, { withinDays: 7 });
    setAgainCardIds(new Set(ids));
  }

  async function loadDeck() {
    const d = await db.decks.get(deckId);
    if (!d || d.deletedAt) {
      router.push("/");
      return;
    }
    setDeck(d);
    setDeckName(d.name);
    setCardsPerSession(d.cardsPerSession || 30);
    setLanguage(d.language || "");
  }

  async function loadCards() {
    const list = await getCardsByDeck(deckId);
    setCards(list);
  }

  // Filter cards by proficiency level, last rating (Again), and search
  const q = searchQuery.trim().toLowerCase();
  const filteredCards = cards.filter((card) => {
    if (proficiencyFilter !== "all" && card.state !== proficiencyFilter) return false;
    if (lastRatingFilter === "again") {
      if (againCardIds === null) return true; // show all until loaded
      if (!againCardIds.has(card.id)) return false;
    }
    if (levelFilter !== "all") {
      if (!isWordCard(card)) return false;
      const lvl = card.data.level;
      if (!lvl || lvl !== levelFilter) return false;
    }
    if (q) {
      const word = isWordCard(card) ? (card.data.word ?? "").toLowerCase() : "";
      const translation = (card.data.translation ?? "").toLowerCase();
      const sentence = isSentenceCard(card) ? (card.data.sentence ?? "").toLowerCase() : "";
      const match = word.includes(q) || translation.includes(q) || sentence.includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Get counts for each proficiency level
  const proficiencyCounts = {
    all: cards.length,
    new: cards.filter((c) => c.state === 0).length,
    learning: cards.filter((c) => c.state === 1).length,
    review: cards.filter((c) => c.state === 2).length,
    relearning: cards.filter((c) => c.state === 3).length,
  };

  function getProficiencyLabel(state: number | "all"): string {
    if (state === "all") return "全部";
    switch (state) {
      case 0:
        return "新卡片";
      case 1:
        return "学习中";
      case 2:
        return "复习中";
      case 3:
        return "重新学习";
      default:
        return "全部";
    }
  }

  function getProficiencyBadge(card: Card): { label: string; className: string } {
    switch (card.state) {
      case 0:
        return {
          label: "新",
          className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
        };
      case 1:
        return {
          label: "学习中",
          className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
        };
      case 2:
        return {
          label: "复习中",
          className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
        };
      case 3:
        return {
          label: "重新学习",
          className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
        };
      default:
        return {
          label: "未知",
          className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
        };
    }
  }

  async function loadDueCount() {
    const due = await getDueCards(deckId);
    setDueCount(due.length);
  }

  async function handleCreateCard(
    type: CardType,
    data: WordCardData | SentenceCardData
  ) {
    await createCard(deckId, type, data);
    setShowForm(false);
    loadCards();
    loadDueCount();
  }

  async function handleUpdateCard(
    id: string,
    type: CardType,
    data: WordCardData | SentenceCardData
  ) {
    await updateCard(id, { type, data });
    setEditingCard(null);
    loadCards();
  }

  async function handleDeleteCard(id: string) {
    if (!confirm("Delete this card?")) return;
    await deleteCard(id);
    setEditingCard(null);
    loadCards();
    loadDueCount();
  }

  async function handleRemoveAgainCards() {
    if (filteredCards.length === 0) return;
    const n = filteredCards.length;
    const word = n === 1 ? "这张卡片" : `这 ${n} 张卡片`;
    if (!confirm(`确定要从牌组移除 ${word} 吗？\n\n（这些是过去一周内评为「Again」的卡片，移除后牌组将不再包含它们。）`)) return;
    for (const card of filteredCards) {
      await deleteCard(card.id);
    }
    setEditingCard(null);
    setLastRatingFilter("all");
    await loadCards();
    await loadDueCount();
    loadAgainCardIds();
  }

  async function handleSaveSettings() {
    if (!deck) return;
    if (!deckName.trim()) {
      alert("Deck name cannot be empty");
      return;
    }
    setSavingSettings(true);
    try {
      await updateDeckSettings(deckId, {
        name: deckName.trim(),
        cardsPerSession: cardsPerSession,
        language: language || undefined,
      });
      await loadDeck();
      setShowSettings(false);
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleCleanWordsWithChinese() {
    const dirtyCards = await findWordCardsWithChinese(deckId);
    if (dirtyCards.length === 0) {
      alert("没有找到包含中文的单词卡片");
      return;
    }

    const wordList = dirtyCards
      .slice(0, 10)
      .map((c) => (isWordCard(c) ? c.data.word : ""))
      .filter(Boolean)
      .join(", ");
    const preview = dirtyCards.length > 10 ? `${wordList}...` : wordList;

    const confirmed = confirm(
      `找到 ${dirtyCards.length} 张包含中文的单词卡片（可能是脏数据）\n\n示例：${preview}\n\n确定要删除这些卡片吗？`
    );

    if (!confirmed) return;

    setCleaning(true);
    try {
      const deletedCount = await cleanWordCardsWithChinese(deckId);
      alert(`已删除 ${deletedCount} 张包含中文的单词卡片`);
      loadCards();
      loadDueCount();
    } catch (error) {
      alert("清理失败：" + (error instanceof Error ? error.message : String(error)));
    } finally {
      setCleaning(false);
    }
  }

  function handleExportCSV() {
    if (cards.length === 0) {
      alert("没有卡片可导出");
      return;
    }

    const csvContent = cardsToCSV(cards);
    const filename = `${deck?.name || "deck"}-${new Date().toISOString().split("T")[0]}.csv`;
    downloadCSV(csvContent, filename);
  }

  async function handleExtractEmptyTranslation() {
    const items = await findCardsWithEmptyTranslation(deckId);
    if (!items || items.trim() === "") {
      alert("没有找到翻译为空的卡片");
      return;
    }
    alert(items);
  }

  async function fetchWordLevel(
    word: string,
    sourceLang: string
  ): Promise<CefrLevel | null> {
    try {
      const res = await fetch("/api/word-level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, sourceLang }),
      });

      if (!res.ok) {
        // If API key missing or other server issue, surface once to the user
        if (res.status === 503 || res.status === 500) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Word level API failed: ${res.status}`);
        }
        console.warn("Word level request failed for", word, res.status);
        return null;
      }

      const data = await res.json();
      const rawLevel = typeof data.level === "string" ? data.level.toUpperCase() : "";
      const validLevels: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
      return validLevels.includes(rawLevel as CefrLevel)
        ? (rawLevel as CefrLevel)
        : null;
    } catch (error) {
      console.error("fetchWordLevel error:", error);
      throw error;
    }
  }

  async function handleFillLevels() {
    if (!deck || levelFilling) return;

    const targetCards = cards.filter(
      (card) => isWordCard(card) && !card.data.level
    );

    if (targetCards.length === 0) {
      alert("没有需要补充难度的单词卡片");
      return;
    }

    const confirmed = confirm(
      `将为 ${targetCards.length} 张单词卡片补充难度等级（A1-C2），可能会消耗 OpenAI 调用额度，是否继续？`
    );
    if (!confirmed) return;

    setLevelFilling(true);
    setLevelProgress({ done: 0, total: targetCards.length });

    const sourceLang = deck.language || "English";
    const maxConcurrency = 10;
    let completed = 0;
    let index = 0;

    const worker = async () => {
      while (true) {
        const currentIndex = index++;
        if (currentIndex >= targetCards.length) break;

        const card = targetCards[currentIndex];
        try {
          const level = await fetchWordLevel(card.data.word, sourceLang);
          if (level) {
            await updateCard(card.id, {
              type: "word",
              data: { ...card.data, level },
            });
          }
        } catch (error) {
          // Already logged inside fetchWordLevel; continue with next card
        } finally {
          completed += 1;
          setLevelProgress({ done: completed, total: targetCards.length });
        }
      }
    };

    try {
      const workerCount = Math.min(maxConcurrency, targetCards.length);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
      alert("难度补充完成");
      await loadCards();
    } catch (error) {
      alert(
        "补充过程中发生错误：" +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setLevelFilling(false);
    }
  }

  if (!deck) return null;

  const levelPercent =
    levelProgress.total > 0
      ? Math.min(100, (levelProgress.done / levelProgress.total) * 100)
      : 0;

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to decks
        </Link>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{deck.name}</h1>
              <p className="text-gray-500 dark:text-gray-400">
                {cards.length} cards · {dueCount} due
                {dueCount > 0 &&
                  ` · 每次复习 ${Math.min(dueCount, deck.cardsPerSession || 30)} 张`}
              </p>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-lg border border-gray-300 bg-white p-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold">设置</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Deck 名称
                </label>
                <input
                  type="text"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter deck name"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  每次复习卡片数量
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={cardsPerSession}
                  onChange={(e) =>
                    setCardsPerSession(parseInt(e.target.value) || 30)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  每次学习和测验时随机选择的卡片数量（1-1000）
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  语言（用于语音播放）
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">未设置</option>
                  <option value="French">French</option>
                  <option value="English">English</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  设置语言后，单词卡片会显示播放按钮用于播放发音
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingSettings ? "保存中..." : "保存"}
                </button>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setDeckName(deck.name);
                    setCardsPerSession(deck.cardsPerSession || 30);
                    setLanguage(deck.language || "");
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {levelFilling && (
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>正在补充难度（A1-C2）</span>
              <span>
                {levelProgress.done} / {levelProgress.total}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${levelPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/deck/${deckId}/review?mode=learning`}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium ${
                dueCount > 0
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400"
              }`}
              title="学习 (N)"
            >
              <Play className="h-4 w-4" />
              学习 {dueCount > 0 && `(${dueCount})`}
              <kbd className="ml-1 rounded border border-current/30 px-1.5 py-0.5 text-xs opacity-80">N</kbd>
            </Link>
            <Link
              href={`/deck/${deckId}/review?mode=test`}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium ${
                dueCount > 0
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400"
              }`}
              title="测验 (M)"
            >
              <Play className="h-4 w-4" />
              测验
              <kbd className="ml-1 rounded border border-current/30 px-1.5 py-0.5 text-xs opacity-80">M</kbd>
            </Link>
            <Link
              href={`/deck/${deckId}/history`}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <History className="h-4 w-4" />
              历史
            </Link>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              aria-expanded={actionsOpen}
              aria-haspopup="true"
            >
              更多操作
              <ChevronDown className={`h-4 w-4 transition-transform ${actionsOpen ? "rotate-180" : ""}`} />
            </button>
            {actionsOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden="true"
                  onClick={() => setActionsOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => {
                      setActionsOpen(false);
                      setShowForm(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Plus className="h-4 w-4" />
                    添加卡片
                  </button>
                  <Link
                    href={`/import?deckId=${deckId}`}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setActionsOpen(false)}
                  >
                    <FileUp className="h-4 w-4" />
                    导入
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setActionsOpen(false);
                      handleExportCSV();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FileDown className="h-4 w-4" />
                    导出 CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionsOpen(false);
                      handleCleanWordsWithChinese();
                    }}
                    disabled={cleaning}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 disabled:opacity-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                  >
                    <Wand2 className="h-4 w-4" />
                    {cleaning ? "清理中..." : "清理脏数据"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionsOpen(false);
                      handleExtractEmptyTranslation();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ClipboardList className="h-4 w-4" />
                    提取空翻译
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionsOpen(false);
                      handleFillLevels();
                    }}
                    disabled={levelFilling}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-700"
                  >
                    <Gauge className="h-4 w-4" />
                    {levelFilling ? "补充中..." : "补充难度 (A1-C2)"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {showForm && (
          <CardForm
            onSubmit={handleCreateCard}
            onCancel={() => setShowForm(false)}
          />
        )}

        {editingCard && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-card-title"
          >
            <div
              className="absolute inset-0 bg-black/10 dark:bg-black/60"
              aria-hidden="true"
              onClick={() => setEditingCard(null)}
            />
            <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <h2
                id="edit-card-title"
                className="flex-shrink-0 border-b border-gray-100 px-5 pt-3 pb-2 text-md font-semibold dark:border-gray-700"
              >
                编辑卡片
              </h2>
              <CardForm
                initialCard={editingCard}
                onSubmit={(type, data) =>
                  handleUpdateCard(editingCard.id, type, data)
                }
                onCancel={() => setEditingCard(null)}
                onDelete={() => handleDeleteCard(editingCard.id)}
                sourceLang={deck.language || "English"}
                stickyActions
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Cards</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索..."
                  className="w-36 rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:w-44"
                  aria-label="搜索卡片"
                />
              </div>
              <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <select
                value={proficiencyFilter}
                onChange={(e) =>
                  setProficiencyFilter(
                    e.target.value === "all" ? "all" : parseInt(e.target.value)
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white w-[120px]"
              >
                <option value="all">
                  全部 ({proficiencyCounts.all})
                </option>
                <option value="0">
                  新卡片 ({proficiencyCounts.new})
                </option>
                <option value="1">
                  学习中 ({proficiencyCounts.learning})
                </option>
                <option value="2">
                  复习中 ({proficiencyCounts.review})
                </option>
                <option value="3">
                  重新学习 ({proficiencyCounts.relearning})
                </option>
              </select>
              <select
                value={lastRatingFilter}
                onChange={(e) =>
                  setLastRatingFilter(e.target.value as "all" | "again")
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white w-[100px]"
              >
                <option value="all">评分</option>
                <option value="again">
                  Again({againCardIds?.size ?? "..."})
                </option>
              </select>
              <select
                value={levelFilter}
                onChange={(e) =>
                  setLevelFilter(
                    e.target.value === "all"
                      ? "all"
                      : (e.target.value as CefrLevel)
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white w-[120px]"
              >
                <option value="all">全部难度</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
              </select>
            </div>
          </div>
          {cards.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              No cards yet. Add one or import from CSV/Anki.
            </p>
          ) : filteredCards.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery.trim()
                ? "没有匹配的卡片"
                : lastRatingFilter === "again"
                  ? "没有过去一周内评为「Again」的卡片"
                  : `没有 ${getProficiencyLabel(proficiencyFilter)} 的卡片`}
            </p>
          ) : (
            filteredCards.map((card) => (
              <div
                key={card.id}
                className={`flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 ${
                  editingCard?.id === card.id ? "ring-2 ring-blue-500" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                      {card.type === "word" ? "单词" : "句子"}
                    </span>
                    {(() => {
                      const badge = getProficiencyBadge(card);
                      return (
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                    {isWordCard(card) && card.data.level && (
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
                        {card.data.level}
                      </span>
                    )}
                  </div>
                  {isWordCard(card) ? (
                    <>
                      <p className="truncate font-medium">{card.data.word}</p>
                      <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                        {card.data.translation}
                      </p>
                    </>
                  ) : isSentenceCard(card) ? (
                    <>
                      <p className="truncate font-medium">
                        {card.data.sentence.length > 50
                          ? `${card.data.sentence.substring(0, 50)}...`
                          : card.data.sentence}
                      </p>
                      <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                        {card.data.translation}
                      </p>
                    </>
                  ) : null}
                </div>
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() =>
                      setEditingCard(editingCard?.id === card.id ? null : card)
                    }
                    className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
