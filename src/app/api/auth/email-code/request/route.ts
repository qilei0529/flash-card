import { NextResponse } from "next/server";

import {
  generateSixDigitCode,
  getOtpCooldownSeconds,
  getOtpTtlSeconds,
  hashEmailCode,
  isValidEmail,
  maskEmail,
  normalizeEmail,
} from "@/lib/email-otp";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/resend";

const GENERIC_RESPONSE = {
  success: true,
  message: "If the email is valid, a verification code has been sent.",
};

export async function POST(req: Request) {
  const traceId = `otp-req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  try {
    const body = await req.json().catch(() => null);
    const emailRaw = typeof body?.email === "string" ? body.email : "";
    const email = normalizeEmail(emailRaw);
    const maskedEmail = maskEmail(email);

    console.info("[email-otp][request]", traceId, "received", { email: maskedEmail });

    if (!email || !isValidEmail(email)) {
      console.info("[email-otp][request]", traceId, "invalid email");
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const cooldownSeconds = getOtpCooldownSeconds();
    const latestOtp = await prisma.emailOtp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (latestOtp) {
      const cooldownMs = cooldownSeconds * 1000;
      const elapsedMs = Date.now() - latestOtp.createdAt.getTime();
      if (elapsedMs < cooldownMs) {
        console.info("[email-otp][request]", traceId, "cooldown active", {
          email: maskedEmail,
          waitMs: cooldownMs - elapsedMs,
        });
        return NextResponse.json(GENERIC_RESPONSE);
      }
    }

    const code = generateSixDigitCode();
    const ttlSeconds = getOtpTtlSeconds();
    const codeHash = hashEmailCode(email, code);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    console.info("[email-otp][request]", traceId, "sending email", {
      email: maskedEmail,
      ttlSeconds,
    });
    await sendOtpEmail({
      to: email,
      code,
      ttlSeconds,
    });
    console.info("[email-otp][request]", traceId, "email sent", { email: maskedEmail });

    await prisma.emailOtp.create({
      data: {
        email,
        codeHash,
        expiresAt,
      },
    });
    console.info("[email-otp][request]", traceId, "otp stored", { email: maskedEmail });

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("[email-otp][request]", traceId, "failed", error);
    return NextResponse.json(
      { success: false, message: "Unable to send verification code." },
      { status: 500 }
    );
  }
}
