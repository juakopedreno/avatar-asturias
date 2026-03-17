-- DropForeignKey
ALTER TABLE "ContentVersion" DROP CONSTRAINT IF EXISTS "ContentVersion_contentItemId_fkey";

-- DropTable
DROP TABLE "ContentVersion";

-- DropTable
DROP TABLE "ContentItem";

-- CreateTable
CREATE TABLE "ControlledResponse" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionVariants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL,
    "author" TEXT NOT NULL,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlledResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlledResponseVersion" (
    "id" TEXT NOT NULL,
    "controlledResponseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlledResponseVersion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ControlledResponseVersion" ADD CONSTRAINT "ControlledResponseVersion_controlledResponseId_fkey" FOREIGN KEY ("controlledResponseId") REFERENCES "ControlledResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
