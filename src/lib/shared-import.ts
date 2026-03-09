import { createCard, getCard, updateCard } from "@/lib/card";
import { db } from "@/lib/db";
import { createDeck, updateDeckSettings } from "@/lib/deck";
import { normalizeShareCode } from "@/lib/shared-deck";
import type { CardType, SentenceCardData, WordCardData } from "@/types";

export type RemoteSharedCard = {
  id: string;
  type: CardType;
  data: WordCardData | SentenceCardData;
};

export type RemoteSharedPackage = {
  id: string;
  code: string;
  name: string;
  language: string | null;
  version: number;
  importedVersion: number | null;
  cards: RemoteSharedCard[];
};

export type ImportSharedResult = {
  deckId: string;
  status: "created" | "updated" | "up_to_date";
  importedVersion: number;
  updatedCards: number;
  createdCards: number;
};

export async function fetchSharedPackageByCode(codeInput: string): Promise<RemoteSharedPackage> {
  const code = normalizeShareCode(codeInput);
  const res = await fetch(`/api/shared-decks/by-code/${encodeURIComponent(code)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : "Failed to fetch package.";
    throw new Error(message);
  }
  const pkg = data?.package;
  if (!isValidRemotePackage(pkg)) {
    throw new Error("Invalid package payload.");
  }
  return pkg;
}

export async function importSharedPackage(pkg: RemoteSharedPackage): Promise<ImportSharedResult> {
  const now = new Date().toISOString();
  const existingLink = await db.sharedDeckLinks
    .where("packageId")
    .equals(pkg.id)
    .first();

  if (!existingLink) {
    const deck = await createDeck(`${pkg.name} (shared)`, pkg.language ?? undefined);
    let createdCards = 0;

    await db.transaction("rw", db.cards, db.sharedCardLinks, db.sharedDeckLinks, async () => {
      for (const remoteCard of pkg.cards) {
        const local = await createCard(deck.id, remoteCard.type, remoteCard.data);
        createdCards += 1;
        await db.sharedCardLinks.add({
          id: crypto.randomUUID(),
          deckId: deck.id,
          packageCardId: remoteCard.id,
          localCardId: local.id,
          updatedAt: now,
        });
      }
      await db.sharedDeckLinks.add({
        id: crypto.randomUUID(),
        code: pkg.code,
        packageId: pkg.id,
        deckId: deck.id,
        importedVersion: pkg.version,
        updatedAt: now,
      });
    });

    await saveImportRecord(pkg.id, pkg.version);
    return {
      deckId: deck.id,
      status: "created",
      importedVersion: pkg.version,
      createdCards,
      updatedCards: 0,
    };
  }

  if (pkg.version <= existingLink.importedVersion) {
    return {
      deckId: existingLink.deckId,
      status: "up_to_date",
      importedVersion: existingLink.importedVersion,
      createdCards: 0,
      updatedCards: 0,
    };
  }

  let createdCards = 0;
  let updatedCards = 0;
  await db.transaction("rw", db.cards, db.sharedCardLinks, db.sharedDeckLinks, async () => {
    await updateDeckSettings(existingLink.deckId, {
      name: `${pkg.name}`,
      language: pkg.language ?? undefined,
    });

    for (const remoteCard of pkg.cards) {
      const link = await db.sharedCardLinks
        .where("[deckId+packageCardId]")
        .equals([existingLink.deckId, remoteCard.id])
        .first();

      if (!link) {
        const local = await createCard(existingLink.deckId, remoteCard.type, remoteCard.data);
        createdCards += 1;
        await db.sharedCardLinks.add({
          id: crypto.randomUUID(),
          deckId: existingLink.deckId,
          packageCardId: remoteCard.id,
          localCardId: local.id,
          updatedAt: now,
        });
        continue;
      }

      const local = await getCard(link.localCardId);
      if (!local || local.deletedAt) {
        const recreated = await createCard(existingLink.deckId, remoteCard.type, remoteCard.data);
        createdCards += 1;
        await db.sharedCardLinks.update(link.id, {
          localCardId: recreated.id,
          updatedAt: now,
        });
        continue;
      }

      await updateCard(local.id, {
        type: remoteCard.type,
        data: remoteCard.data,
      });
      updatedCards += 1;
      await db.sharedCardLinks.update(link.id, { updatedAt: now });
    }

    await db.sharedDeckLinks.update(existingLink.id, {
      code: pkg.code,
      importedVersion: pkg.version,
      updatedAt: now,
    });
  });

  await saveImportRecord(pkg.id, pkg.version);
  return {
    deckId: existingLink.deckId,
    status: "updated",
    importedVersion: pkg.version,
    createdCards,
    updatedCards,
  };
}

async function saveImportRecord(packageId: string, importedVersion: number) {
  await fetch("/api/shared-decks/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packageId, importedVersion }),
  });
}

function isValidRemotePackage(value: unknown): value is RemoteSharedPackage {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.code !== "string" ||
    typeof record.name !== "string" ||
    typeof record.version !== "number" ||
    !Array.isArray(record.cards)
  ) {
    return false;
  }
  const cards = record.cards as unknown[];
  return cards.every(isValidRemoteCard);
}

function isValidRemoteCard(value: unknown): value is RemoteSharedCard {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const type = record.type;
  const data = record.data;
  if (typeof record.id !== "string" || (type !== "word" && type !== "sentence")) {
    return false;
  }
  if (!data || typeof data !== "object") return false;
  const payload = data as Record<string, unknown>;
  if (type === "word") {
    return typeof payload.word === "string" && typeof payload.translation === "string";
  }
  return typeof payload.sentence === "string" && typeof payload.translation === "string";
}
