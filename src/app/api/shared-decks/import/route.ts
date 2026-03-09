import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSharedDeckPrismaReady } from "@/lib/shared-deck-server";

type SessionUser = { id?: string | null };

function getSessionUserId(session: unknown): string | null {
  const user = (session as { user?: SessionUser } | null)?.user;
  return typeof user?.id === "string" && user.id ? user.id : null;
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

    const body = await req.json().catch(() => null);
    const packageId = typeof body?.packageId === "string" ? body.packageId : "";
    const importedVersion =
      typeof body?.importedVersion === "number" ? Math.floor(body.importedVersion) : 0;

    if (!packageId || importedVersion < 1) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const pkg = await prisma.sharedDeckPackage.findUnique({
      where: { id: packageId },
      select: { id: true, version: true },
    });
    if (!pkg) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const saved = await prisma.sharedDeckImport.upsert({
      where: {
        userId_packageId: {
          userId,
          packageId: pkg.id,
        },
      },
      create: {
        userId,
        packageId: pkg.id,
        importedVersion: Math.min(importedVersion, pkg.version),
      },
      update: {
        importedVersion: Math.min(importedVersion, pkg.version),
      },
    });

    return NextResponse.json({
      import: {
        packageId: saved.packageId,
        importedVersion: saved.importedVersion,
      },
    });
  } catch (error) {
    console.error("shared-decks import error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
