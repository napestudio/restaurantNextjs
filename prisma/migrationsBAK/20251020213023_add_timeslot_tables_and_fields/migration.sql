/*
  Warnings:

  - A unique constraint covering the columns `[restaurantId,name]` on the table `Branch` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[restaurantId,slug]` on the table `Branch` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[restaurantId,name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[restaurantId,name]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reservationId,tableId]` on the table `ReservationTable` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Restaurant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[branchId,number]` on the table `Table` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `restaurantId` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurantId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Restaurant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Restaurant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `TimeSlot` table without a default value. This is not possible if the table is not empty.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "public"."TableStatus" AS ENUM ('EMPTY', 'OCCUPIED', 'RESERVED', 'CLEANING');

-- AlterEnum
ALTER TYPE "public"."TableShape" ADD VALUE 'WIDE';

-- AlterTable
ALTER TABLE "public"."Branch" ADD COLUMN     "slug" CITEXT;

-- AlterTable
ALTER TABLE "public"."Category" ADD COLUMN     "restaurantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "restaurantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Restaurant" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slug" CITEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Table" ADD COLUMN     "isShared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "public"."TableStatus";

-- AlterTable
ALTER TABLE "public"."TimeSlot" ADD COLUMN     "moreInfoUrl" TEXT,
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."TimeSlotTable" (
    "id" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,

    CONSTRAINT "TimeSlotTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReservedSlug" (
    "slug" CITEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservedSlug_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "TimeSlotTable_tableId_idx" ON "public"."TimeSlotTable"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlotTable_timeSlotId_tableId_key" ON "public"."TimeSlotTable"("timeSlotId", "tableId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_restaurantId_name_key" ON "public"."Branch"("restaurantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_restaurantId_slug_key" ON "public"."Branch"("restaurantId", "slug");

-- CreateIndex
CREATE INDEX "Category_restaurantId_idx" ON "public"."Category"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_restaurantId_name_key" ON "public"."Category"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "Product_restaurantId_idx" ON "public"."Product"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_restaurantId_name_key" ON "public"."Product"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "Reservation_branchId_date_status_idx" ON "public"."Reservation"("branchId", "date", "status");

-- CreateIndex
CREATE INDEX "Reservation_date_timeSlotId_idx" ON "public"."Reservation"("date", "timeSlotId");

-- CreateIndex
CREATE INDEX "ReservationTable_tableId_idx" ON "public"."ReservationTable"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationTable_reservationId_tableId_key" ON "public"."ReservationTable"("reservationId", "tableId");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "public"."Restaurant"("slug");

-- CreateIndex
CREATE INDEX "Restaurant_slug_idx" ON "public"."Restaurant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Table_branchId_number_key" ON "public"."Table"("branchId", "number");

-- AddForeignKey
ALTER TABLE "public"."TimeSlotTable" ADD CONSTRAINT "TimeSlotTable_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "public"."TimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeSlotTable" ADD CONSTRAINT "TimeSlotTable_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
