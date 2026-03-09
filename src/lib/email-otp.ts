import { createHash, randomInt } from "crypto";

const DEFAULT_OTP_TTL_SECONDS = 600;
const DEFAULT_OTP_COOLDOWN_SECONDS = 60;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function maskEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const [localPart = "", domain = ""] = normalized.split("@");

  if (!localPart || !domain) {
    return "[invalid-email]";
  }

  const localMasked =
    localPart.length <= 2
      ? `${localPart[0] ?? "*"}*`
      : `${localPart[0]}${"*".repeat(Math.max(1, localPart.length - 2))}${localPart[localPart.length - 1]}`;

  return `${localMasked}@${domain}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getOtpTtlSeconds(): number {
  const value = Number(process.env.AUTH_OTP_TTL_SECONDS ?? DEFAULT_OTP_TTL_SECONDS);
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_OTP_TTL_SECONDS;
  }
  return Math.floor(value);
}

export function getOtpCooldownSeconds(): number {
  const value = Number(
    process.env.AUTH_OTP_RESEND_COOLDOWN_SECONDS ?? DEFAULT_OTP_COOLDOWN_SECONDS
  );
  if (!Number.isFinite(value) || value < 0) {
    return DEFAULT_OTP_COOLDOWN_SECONDS;
  }
  return Math.floor(value);
}

export function generateSixDigitCode(): string {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

export function hashEmailCode(email: string, code: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "flash-card-email-otp-fallback-secret";
  return createHash("sha256")
    .update(`${normalizeEmail(email)}:${code}:${secret}`)
    .digest("hex");
}
