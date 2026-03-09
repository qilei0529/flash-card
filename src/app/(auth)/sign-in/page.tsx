'use client';

import type { Metadata } from "next";
import { signIn } from "next-auth/react";


export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Flash Card SRS
          </h1>
          <p className="text-sm text-slate-400">
            Sign in with Google to keep your decks and review history in sync.
          </p>
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white text-slate-900 px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 focus-visible:ring-offset-slate-950"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[11px] font-bold text-white">
            G
          </span>
          <span>Continue with Google</span>
        </button>

        <p className="text-[11px] leading-relaxed text-center text-slate-500">
          We only use your email and basic profile information to identify your
          account. You can revoke access at any time from your Google account
          settings.
        </p>
      </div>
    </main>
  );
}

