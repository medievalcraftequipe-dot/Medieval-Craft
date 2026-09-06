ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT;

CREATE TABLE "PasswordResetCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "resetTokenHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetCode_codeHash_key" ON "PasswordResetCode"("codeHash");
CREATE UNIQUE INDEX "PasswordResetCode_resetTokenHash_key" ON "PasswordResetCode"("resetTokenHash");
CREATE INDEX "PasswordResetCode_userId_usedAt_idx" ON "PasswordResetCode"("userId", "usedAt");
CREATE INDEX "PasswordResetCode_expiresAt_idx" ON "PasswordResetCode"("expiresAt");

ALTER TABLE "PasswordResetCode" ADD CONSTRAINT "PasswordResetCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
