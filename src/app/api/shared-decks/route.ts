import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateShareCode,
  isValidShareCode,
  normalizeShareCode,
  parseShareCardInput,
  type ShareCardInput,
} from "@/lib/shared-deck";
import { ensureSharedDeckPrismaReady } from "@/lib/shared-deck-server";

type SessionUser = { id?: string | null };

function getSessionUserId(session: unknown): string | null {
  const user = (session as { user?: SessionUser } | null)?.user;
  return typeof user?.id === "string" && user.id ? user.id : null;
}

function toInputJsonValue(value: ShareCardInput["data"]): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

export async function POST(req: NextRequest) {
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

    const body = (await req.json().catch(() => null)) as
      | {
          code?: unknown;
          deck?: { name?: unknown; language?: unknown };
          cards?: unknown;
        }
      | null;
    const deck = body?.deck;
    const cardsRaw: unknown[] = Array.isArray(body?.cards) ? body.cards : [];
    const inputCode = typeof body?.code === "string" ? normalizeShareCode(body.code) : "";

    const name = typeof deck?.name === "string" ? deck.name.trim() : "";
    const language = typeof deck?.language === "string" ? deck.language.trim() : null;

    if (!name) {
      return NextResponse.json({ error: "invalid_deck_name" }, { status: 400 });
    }
    if (cardsRaw.length === 0 || cardsRaw.length > 5000) {
      return NextResponse.json({ error: "invalid_cards_count" }, { status: 400 });
    }
    if (inputCode && !isValidShareCode(inputCode)) {
      return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    }

    const cards: ShareCardInput[] = cardsRaw
      .map(parseShareCardInput)
      .filter((card): card is ShareCardInput => Boolean(card));
    if (cards.length !== cardsRaw.length) {
      return NextResponse.json({ error: "invalid_cards_payload" }, { status: 400 });
    }

    const deduped = new Set(cards.map((card) => card.clientCardId));
    if (deduped.size !== cards.length) {
      return NextResponse.json({ error: "duplicate_client_card_id" }, { status: 400 });
    }

    const existingPackage = inputCode
      ? await prisma.sharedDeckPackage.findUnique({ where: { code: inputCode } })
      : null;

    if (existingPackage && existingPackage.userId !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (inputCode && !existingPackage) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const now = new Date();
    if (!existingPackage) {
      let code = inputCode;
      if (!code) {
        let attempts = 0;
        do {
          code = generateShareCode(8);
          attempts += 1;
          const existed = await prisma.sharedDeckPackage.findUnique({ where: { code } });
          if (!existed) break;
        } while (attempts < 10);
      }
      if (!code) {
        return NextResponse.json({ error: "unable_to_generate_code" }, { status: 500 });
      }

      const created = await prisma.sharedDeckPackage.create({
        data: {
          userId,
          code,
          name,
          language: language || null,
          version: 1,
          publishedAt: now,
          cards: {
            create: cards.map((card, index) => ({
              clientCardId: card.clientCardId,
              position: index,
              type: card.type,
              data: toInputJsonValue(card.data),
            })),
          },
        },
      });

      return NextResponse.json({
        packageId: created.id,
        code: created.code,
        version: created.version,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const pkg = await tx.sharedDeckPackage.findUnique({
        where: { id: existingPackage.id },
        include: { cards: true },
      });
      if (!pkg) throw new Error("package_not_found");

      const existingByClientId = new Map(pkg.cards.map((card) => [card.clientCardId, card]));

      for (let i = 0; i < cards.length; i += 1) {
        const card = cards[i];
        const existed = existingByClientId.get(card.clientCardId);
        if (existed) {
          await tx.sharedDeckCard.update({
            where: { id: existed.id },
            data: {
              position: i,
              type: card.type,
              data: toInputJsonValue(card.data),
            },
          });
          continue;
        }
        await tx.sharedDeckCard.create({
          data: {
            packageId: pkg.id,
            clientCardId: card.clientCardId,
            position: i,
            type: card.type,
            data: toInputJsonValue(card.data),
          },
        });
      }

      const keepIds = new Set(cards.map((card) => card.clientCardId));
      const removeIds = pkg.cards
        .filter((card) => !keepIds.has(card.clientCardId))
        .map((card) => card.id);
      if (removeIds.length > 0) {
        await tx.sharedDeckCard.deleteMany({
          where: { id: { in: removeIds } },
        });
      }

      return tx.sharedDeckPackage.update({
        where: { id: pkg.id },
        data: {
          name,
          language: language || null,
          version: { increment: 1 },
          publishedAt: now,
        },
      });
    });

    return NextResponse.json({
      packageId: updated.id,
      code: updated.code,
      version: updated.version,
    });
  } catch (error) {
    console.error("shared-decks publish error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
