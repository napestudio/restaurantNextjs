/*
  Warnings:

  - You are about to drop the column `label` on the `TimeSlot` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `TimeSlot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."TimeSlot" DROP COLUMN "label",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "daysOfWeek" TEXT[],
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "pricePerPerson" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "startTime" SET DATA TYPE TIME,
ALTER COLUMN "endTime" SET DATA TYPE TIME;
