-- CreateEnum
CREATE TYPE "PrintMode" AS ENUM ('STATION_ITEMS', 'FULL_ORDER', 'BOTH');

-- AlterTable
ALTER TABLE "Printer" ADD COLUMN     "printMode" "PrintMode" NOT NULL DEFAULT 'STATION_ITEMS';
