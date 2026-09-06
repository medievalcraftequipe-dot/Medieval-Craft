-- AlterTable
ALTER TABLE "Server" ADD COLUMN "clientState" JSONB;

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ServerChannelMessage" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerChannelMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerVoiceSession" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "speaking" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerVoiceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServerChannelMessage_serverId_channelName_createdAt_idx" ON "ServerChannelMessage"("serverId", "channelName", "createdAt");

-- CreateIndex
CREATE INDEX "ServerChannelMessage_authorId_idx" ON "ServerChannelMessage"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerVoiceSession_serverId_userId_key" ON "ServerVoiceSession"("serverId", "userId");

-- CreateIndex
CREATE INDEX "ServerVoiceSession_serverId_channelName_lastSeenAt_idx" ON "ServerVoiceSession"("serverId", "channelName", "lastSeenAt");

-- CreateIndex
CREATE INDEX "ServerVoiceSession_userId_idx" ON "ServerVoiceSession"("userId");

-- AddForeignKey
ALTER TABLE "ServerChannelMessage" ADD CONSTRAINT "ServerChannelMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerChannelMessage" ADD CONSTRAINT "ServerChannelMessage_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerVoiceSession" ADD CONSTRAINT "ServerVoiceSession_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerVoiceSession" ADD CONSTRAINT "ServerVoiceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
