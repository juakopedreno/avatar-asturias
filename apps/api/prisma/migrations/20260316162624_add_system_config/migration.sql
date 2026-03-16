-- AlterTable
ALTER TABLE "public"."ContentItem" ALTER COLUMN "languages" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "modules" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "public"."SystemConfig"("key");
