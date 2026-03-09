import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidShareCode, normalizeShareCode } from "@/lib/shared-deck";
import { ensureSharedDeckPrismaReady } from "@/lib/shared-deck-server";

type SessionUser = { id?: string | null };

function getSessionUserId(session: unknown): string | null {
  const user = (session as { user?: SessionUser } | null)?.user;
  return typeof user?.id === "string" && user.id ? user.id : null;
}

export async function GET(_: Request, context: { params: Promise<{ code: string }> }) {
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

    const params = await context.params;
    const code = normalizeShareCode(params.code ?? "");
    if (!isValidShareCode(code)) {
      return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    }

    const pkg = await prisma.sharedDeckPackage.findUnique({
      where: { code },
      include: {
        cards: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            clientCardId: true,
            position: true,
            type: true,
            data: true,
          },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const importRecord = await prisma.sharedDeckImport.findUnique({
      where: {
        userId_packageId: {
          userId,
          packageId: pkg.id,
        },
      },
      select: {
        importedVersion: true,
      },
    });

    return NextResponse.json({
      package: {
        id: pkg.id,
        code: pkg.code,
        name: pkg.name,
        language: pkg.language,
        version: pkg.version,
        updatedAt: pkg.updatedAt,
        cards: pkg.cards,
        importedVersion: importRecord?.importedVersion ?? null,
      },
    });
  } catch (error) {
    console.error("shared-decks by-code error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
