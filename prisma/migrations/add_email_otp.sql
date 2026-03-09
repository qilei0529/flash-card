-- CreateTable
CREATE TABLE IF NOT EXISTS "EmailOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailOtp_email_createdAt_idx" ON "EmailOtp"("email", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailOtp_email_expiresAt_idx" ON "EmailOtp"("email", "expiresAt");
