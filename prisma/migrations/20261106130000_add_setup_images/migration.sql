-- CreateTable
CREATE TABLE "SetupImage" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetupImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SetupImage_createdAt_idx" ON "SetupImage"("createdAt");
