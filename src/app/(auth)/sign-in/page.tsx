'use client';

import { signIn } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";

const DEFAULT_COOLDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [callbackUrl, setCallbackUrl] = useState("/");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCallbackUrl(params.get("callbackUrl") || "/");
  }, []);

  useEffect(() => {
    if (!lastSentAt) {
      return;
    }

    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - lastSentAt) / 1000);
      if (elapsedSeconds >= DEFAULT_COOLDOWN_SECONDS) {
        setLastSentAt(null);
        return;
      }
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lastSentAt]);

  const cooldownLeft = (() => {
    if (!lastSentAt) {
      return 0;
    }
    const elapsed = Math.floor((now - lastSentAt) / 1000);
    return Math.max(0, DEFAULT_COOLDOWN_SECONDS - elapsed);
  })();

  async function handleSendCode() {
    const normalizedEmail = email.trim().toLowerCase();
    setError("");
    setMessage("");

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (cooldownLeft > 0) {
      setError(`Please wait ${cooldownLeft}s before sending another code.`);
      return;
    }

    setIsSendingCode(true);
    try {
      const response = await fetch("/api/auth/email-code/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (!response.ok) {
        setError("Unable to send code right now. Please try again shortly.");
        return;
      }

      setLastSentAt(Date.now());
      setMessage("If the email is valid, the 6-digit code has been sent.");
    } catch {
      setError("Unable to send code right now. Please try again shortly.");
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleEmailCodeSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setIsSigningIn(true);
    const result = await signIn("email-code", {
      redirect: false,
      email: normalizedEmail,
      code: code.trim(),
      callbackUrl,
    });
    setIsSigningIn(false);

    if (result?.error) {
      setError("Invalid or expired code. Please request a new one.");
      return;
    }

    window.location.href = result?.url || callbackUrl;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Flash Card SRS
          </h1>
          <p className="text-sm text-slate-400">
            Sign in with Google or an email verification code to keep your decks
            and review history in sync.
          </p>
        </div>

        <form className="space-y-3" onSubmit={handleEmailCodeSignIn}>
          <label className="block space-y-1">
            <span className="text-xs text-slate-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              autoComplete="email"
              required
            />
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="6-digit code"
              className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={isSendingCode || cooldownLeft > 0}
              className="rounded-lg border border-slate-700 px-3 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingCode
                ? "Sending..."
                : cooldownLeft > 0
                  ? `Resend ${cooldownLeft}s`
                  : "Send code"}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSigningIn}
            className="inline-flex w-full items-center justify-center rounded-lg bg-sky-500 text-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningIn ? "Signing in..." : "Sign in with email code"}
          </button>
        </form>

        {message ? (
          <p className="text-xs text-emerald-300 text-center">{message}</p>
        ) : null}
        {error ? <p className="text-xs text-rose-300 text-center">{error}</p> : null}

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-2 text-slate-500">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white text-slate-900 px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 focus-visible:ring-offset-slate-950"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[11px] font-bold text-white">
            G
          </span>
          <span>Continue with Google</span>
        </button>

        <p className="text-[11px] leading-relaxed text-center text-slate-500">
          We only use your email and basic profile information to identify your account.
          Verification codes expire quickly for security. You can revoke Google access at
          any time from your Google account settings.
        </p>
      </div>
    </main>
  );
}

