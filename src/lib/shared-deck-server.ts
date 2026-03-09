import { prisma } from "@/lib/prisma";

export function ensureSharedDeckPrismaReady(): { ok: true } | { ok: false; error: string } {
  const hasPackage = typeof (prisma as { sharedDeckPackage?: unknown }).sharedDeckPackage !== "undefined";
  const hasCard = typeof (prisma as { sharedDeckCard?: unknown }).sharedDeckCard !== "undefined";
  const hasImport = typeof (prisma as { sharedDeckImport?: unknown }).sharedDeckImport !== "undefined";

  if (hasPackage && hasCard && hasImport) {
    return { ok: true };
  }

  return {
    ok: false,
    error:
      "prisma_client_outdated: run `pnpm prisma generate` and restart `pnpm dev`",
  };
}
