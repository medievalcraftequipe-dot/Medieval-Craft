CREATE TABLE "VoiceSignal" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VoiceSignal_serverId_channelName_toUserId_createdAt_idx" ON "VoiceSignal"("serverId", "channelName", "toUserId", "createdAt");
CREATE INDEX "VoiceSignal_fromUserId_idx" ON "VoiceSignal"("fromUserId");
CREATE INDEX "VoiceSignal_toUserId_idx" ON "VoiceSignal"("toUserId");
CREATE INDEX "VoiceSignal_createdAt_idx" ON "VoiceSignal"("createdAt");

ALTER TABLE "VoiceSignal" ADD CONSTRAINT "VoiceSignal_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoiceSignal" ADD CONSTRAINT "VoiceSignal_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoiceSignal" ADD CONSTRAINT "VoiceSignal_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
