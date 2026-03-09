import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSharedDeckPrismaReady } from "@/lib/shared-deck-server";

type SessionUser = { id?: string | null };

function getSessionUserId(session: unknown): string | null {
  const user = (session as { user?: SessionUser } | null)?.user;
  return typeof user?.id === "string" && user.id ? user.id : null;
}

export async function GET() {
  try {
    const ready = ensureSharedDeckPrismaReady();
    if (!ready.ok) {
      return NextResponse.json({ error: ready.error }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    const userId = getSessionUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const packages = await prisma.sharedDeckPackage.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        code: true,
        name: true,
        language: true,
        version: true,
        publishedAt: true,
        updatedAt: true,
        _count: {
          select: { cards: true },
        },
      },
    });

    return NextResponse.json({
      packages: packages.map((pkg) => ({
        ...pkg,
        cardsCount: pkg._count.cards,
      })),
    });
  } catch (error) {
    console.error("shared-decks mine error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
