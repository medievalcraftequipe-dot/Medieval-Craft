-- CreateTable
CREATE TABLE "ProfilePost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfilePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfilePostLike" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfilePostLike_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateTable
CREATE TABLE "UserProfileLike" (
    "targetUserId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProfileLike_pkey" PRIMARY KEY ("targetUserId","userId")
);

-- CreateTable
CREATE TABLE "ServerLike" (
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerLike_pkey" PRIMARY KEY ("serverId","userId")
);

-- CreateIndex
CREATE INDEX "ProfilePost_authorId_createdAt_idx" ON "ProfilePost"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfilePost_deletedAt_idx" ON "ProfilePost"("deletedAt");

-- CreateIndex
CREATE INDEX "ProfilePostLike_userId_idx" ON "ProfilePostLike"("userId");

-- CreateIndex
CREATE INDEX "UserProfileLike_userId_idx" ON "UserProfileLike"("userId");

-- CreateIndex
CREATE INDEX "ServerLike_userId_idx" ON "ServerLike"("userId");

-- AddForeignKey
ALTER TABLE "ProfilePost" ADD CONSTRAINT "ProfilePost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilePostLike" ADD CONSTRAINT "ProfilePostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ProfilePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilePostLike" ADD CONSTRAINT "ProfilePostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfileLike" ADD CONSTRAINT "UserProfileLike_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfileLike" ADD CONSTRAINT "UserProfileLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerLike" ADD CONSTRAINT "ServerLike_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerLike" ADD CONSTRAINT "ServerLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
