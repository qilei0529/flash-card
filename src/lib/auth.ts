import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { hashEmailCode, maskEmail, normalizeEmail } from "@/lib/email-otp";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      id: "email-code",
      name: "Email Code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const traceId = `otp-auth-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const email = normalizeEmail(credentials?.email ?? "");
        const code = String(credentials?.code ?? "").trim();
        const maskedEmail = maskEmail(email);
        const now = new Date();

        console.info("[email-otp][authorize]", traceId, "received", {
          email: maskedEmail,
          codeLength: code.length,
        });

        if (!email || !/^\d{6}$/.test(code)) {
          console.info("[email-otp][authorize]", traceId, "invalid payload", {
            email: maskedEmail,
          });
          return null;
        }

        const otp = await prisma.emailOtp.findFirst({
          where: {
            email,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (!otp) {
          console.info("[email-otp][authorize]", traceId, "otp not found", {
            email: maskedEmail,
          });
          return null;
        }

        const hash = hashEmailCode(email, code);
        if (hash !== otp.codeHash) {
          console.info("[email-otp][authorize]", traceId, "otp mismatch", {
            email: maskedEmail,
          });
          return null;
        }

        console.info("[email-otp][authorize]", traceId, "otp validated", {
          email: maskedEmail,
        });

        const user = await prisma.user.upsert({
          where: { email },
          update: {
            emailVerified: now,
          },
          create: {
            email,
            emailVerified: now,
          },
        });
        console.info("[email-otp][authorize]", traceId, "user upserted", {
          email: maskedEmail,
          userId: user.id,
        });

        await prisma.emailOtp.updateMany({
          where: {
            id: otp.id,
            consumedAt: null,
          },
          data: {
            consumedAt: now,
          },
        });
        console.info("[email-otp][authorize]", traceId, "otp consumed", {
          email: maskedEmail,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const withId = user as { id?: string };
        if (withId.id) {
          token.id = withId.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
          const userWithId = session.user as { id?: unknown };
          userWithId.id = token.id;
      }
      return session;
    },
  },
};

