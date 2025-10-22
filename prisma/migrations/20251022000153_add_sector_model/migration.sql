-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'SUPERADMIN';

-- AlterTable
ALTER TABLE "public"."Table" ADD COLUMN     "name" TEXT,
ADD COLUMN     "sectorId" TEXT;

-- CreateTable
CREATE TABLE "public"."Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sector_branchId_idx" ON "public"."Sector"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_branchId_name_key" ON "public"."Sector"("branchId", "name");

-- CreateIndex
CREATE INDEX "Table_sectorId_idx" ON "public"."Table"("sectorId");

-- AddForeignKey
ALTER TABLE "public"."Sector" ADD CONSTRAINT "Sector_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Table" ADD CONSTRAINT "Table_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "public"."Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
