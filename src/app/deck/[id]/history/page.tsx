"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, Circle, Eye } from "lucide-react";
import { db } from "@/lib/db";
import { getSessionsByDeck } from "@/lib/session";
import { TestResultModal } from "@/components/TestResultModal";
import type { Deck, Session } from "@/types";

function groupSessionsByDate(sessions: Session[]): Map<string, Session[]> {
  const groups = new Map<string, Session[]>();
  
  for (const session of sessions) {
    const date = new Date(session.createdAt);
    const dateKey = date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(session);
  }
  
  return groups;
}

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeckAndSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  async function loadDeckAndSessions() {
    const d = await db.decks.get(deckId);
    if (!d || d.deletedAt) {
      router.push("/");
      return;
    }
    setDeck(d);

    const sessionList = await getSessionsByDeck(deckId);
    setSessions(sessionList);
    setLoading(false);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (sessionDate.getTime() === today.getTime()) {
      return "今天";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (sessionDate.getTime() === yesterday.getTime()) {
      return "昨天";
    }

    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      return `${diffDays} 天前`;
    }

    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }


  if (loading) {
    return (
      <main className="min-h-screen p-4">
        <div className="mx-auto max-w-3xl">
          <div className="p-8 text-center">Loading...</div>
        </div>
      </main>
    );
  }

  if (!deck) return null;

  return (
    <main className="min-h-screen p-4">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/deck/${deckId}`}
          className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to deck
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">学习历史</p>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              还没有学习记录。开始你的第一次学习吧！
            </p>
          </div>
        ) : (
          <SessionList sessions={sessions} deckId={deckId} deck={deck} />
        )}
      </div>
    </main>
  );
}

function SessionList({
  sessions,
  deckId,
  deck,
}: {
  sessions: Session[];
  deckId: string;
  deck: Deck;
}) {
  const [viewSessionId, setViewSessionId] = useState<string | null>(null);
  const [viewSessionMode, setViewSessionMode] = useState<"learning" | "test">("test");

  const groupedSessions = groupSessionsByDate(sessions);
  // Sort dates by getting the first session's createdAt from each group
  const sortedDates = Array.from(groupedSessions.keys()).sort((a, b) => {
    const sessionA = groupedSessions.get(a);
    const sessionB = groupedSessions.get(b);
    if (!sessionA || !sessionB || sessionA.length === 0 || sessionB.length === 0) {
      return 0;
    }
    return new Date(sessionB[0].createdAt).getTime() - new Date(sessionA[0].createdAt).getTime();
  });

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (sessionDate.getTime() === today.getTime()) {
      return "今天";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (sessionDate.getTime() === yesterday.getTime()) {
      return "昨天";
    }

    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      return `${diffDays} 天前`;
    }

    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds} 秒`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (s === 0) return `${m} 分钟`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="space-y-8">
      {sortedDates.map((dateKey) => {
        const dateSessions = groupedSessions.get(dateKey);
        if (!dateSessions || dateSessions.length === 0) return null;
        const firstSession = dateSessions[0];
        const displayDate = formatDate(firstSession.createdAt);

        return (
          <div key={dateKey}>
            <h2 className="mb-4 text-lg font-semibold text-gray-700 dark:text-gray-300">
              {displayDate}
            </h2>
            <div className="space-y-3">
              {dateSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            session.mode === "learning"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
                          }`}
                        >
                          {session.mode === "learning" ? "学习模式" : "测验模式"}
                        </span>
                        {session.completedAt ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" />
                            已完成
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Circle className="h-3 w-3" />
                            未完成
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(session.createdAt)}
                        </span>
                        <span>
                          {session.completedCards} / {session.totalCards} 张卡片
                        </span>
                        {session.durationSeconds != null && (
                          <span>{formatDuration(session.durationSeconds)}</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {!session.completedAt ? (
                        <Link
                          href={`/deck/${deckId}/review?mode=${session.mode}&sessionId=${session.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          继续
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setViewSessionId(session.id);
                            setViewSessionMode(session.mode);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          查看
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <TestResultModal
        sessionId={viewSessionId}
        sessionMode={viewSessionMode}
        deck={deck}
        onClose={() => {
          setViewSessionId(null);
          setViewSessionMode("test");
        }}
      />
    </div>
  );
}
