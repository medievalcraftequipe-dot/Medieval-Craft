-- CreateTable
CREATE TABLE "AuthAttempt" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "identifierHash" TEXT NOT NULL,
    "ipHash" TEXT,
    "userId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "targetId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthAttempt_scope_identifierHash_createdAt_idx" ON "AuthAttempt"("scope", "identifierHash", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAttempt_scope_ipHash_createdAt_idx" ON "AuthAttempt"("scope", "ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAttempt_userId_createdAt_idx" ON "AuthAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_action_createdAt_idx" ON "SecurityEvent"("action", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_actorId_createdAt_idx" ON "SecurityEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_targetId_createdAt_idx" ON "SecurityEvent"("targetId", "createdAt");

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
