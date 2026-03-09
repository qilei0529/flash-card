import type { CardType, SentenceCardData, WordCardData } from "@/types";

const SHARE_CODE_REGEX = /^[A-Z0-9]{6,12}$/;
const SHARE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type ShareCardInput = {
  clientCardId: string;
  type: CardType;
  data: WordCardData | SentenceCardData;
};

export function normalizeShareCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidShareCode(code: string): boolean {
  return SHARE_CODE_REGEX.test(code);
}

export function generateShareCode(length = 8): string {
  let output = "";
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * SHARE_CODE_CHARS.length);
    output += SHARE_CODE_CHARS[index];
  }
  return output;
}

export function parseShareCardInput(value: unknown): ShareCardInput | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const clientCardId = typeof record.clientCardId === "string" ? record.clientCardId.trim() : "";
  const type = record.type;
  const data = record.data;

  if (!clientCardId || (type !== "word" && type !== "sentence")) return null;
  if (!isValidCardData(type, data)) return null;

  return {
    clientCardId,
    type,
    data,
  };
}

function isValidCardData(type: CardType, data: unknown): data is WordCardData | SentenceCardData {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;

  if (type === "word") {
    return typeof record.word === "string" && typeof record.translation === "string";
  }

  return (
    typeof record.sentence === "string" &&
    typeof record.translation === "string"
  );
}
