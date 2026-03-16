-- This migration mirrors prisma/schema.prisma baseline.
-- Apply with: npm run db:migrate -w @avatar/api

CREATE TYPE "UserRole" AS ENUM ('admin', 'editor', 'viewer', 'auditor');
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'review', 'published', 'archived');
CREATE TYPE "SourceType" AS ENUM ('pdf', 'api', 'web', 'database', 'manual');
CREATE TYPE "SourceStatus" AS ENUM ('synced', 'pending', 'error');
CREATE TYPE "IngestionSourceKind" AS ENUM ('pdf', 'web', 'api');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'active',
  "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  "mfaSecret" TEXT,
  "modules" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "revoked" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentItem" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "status" "ContentStatus" NOT NULL,
  "author" TEXT NOT NULL,
  "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentVersion" (
  "id" TEXT NOT NULL,
  "contentItemId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Source" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "SourceType" NOT NULL,
  "status" "SourceStatus" NOT NULL DEFAULT 'pending',
  "connectorJson" TEXT NOT NULL,
  "documents" INTEGER NOT NULL DEFAULT 0,
  "confidence" INTEGER NOT NULL DEFAULT 0,
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourceDocument" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "uri" TEXT NOT NULL,
  "rawText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SourceDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IngestionJob" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT,
  "sourceKind" "IngestionSourceKind" NOT NULL,
  "status" "SourceStatus" NOT NULL DEFAULT 'pending',
  "inputRef" TEXT NOT NULL,
  "outputChunks" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "IngestionJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeChunk" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceLabel" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Citation" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceLabel" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEntry" (
  "id" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IngestionJob" ADD CONSTRAINT "IngestionJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
