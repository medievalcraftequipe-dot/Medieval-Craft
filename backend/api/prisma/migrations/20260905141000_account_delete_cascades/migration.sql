ALTER TABLE "Server" DROP CONSTRAINT "Server_ownerId_fkey";
ALTER TABLE "Server" ADD CONSTRAINT "Server_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ban" DROP CONSTRAINT "Ban_moderatorId_fkey";
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModerationAction" DROP CONSTRAINT "ModerationAction_moderatorId_fkey";
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
