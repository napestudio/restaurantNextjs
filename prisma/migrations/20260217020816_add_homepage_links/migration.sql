-- CreateEnum
CREATE TYPE "HomePageLinkType" AS ENUM ('MENU', 'TIMESLOT', 'RESERVATION', 'CUSTOM');

-- CreateTable
CREATE TABLE "HomePageLink" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "type" "HomePageLinkType" NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "menuId" TEXT,
    "timeSlotId" TEXT,
    "customUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomePageLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomePageLink_branchId_isActive_order_idx" ON "HomePageLink"("branchId", "isActive", "order");

-- CreateIndex
CREATE INDEX "HomePageLink_branchId_idx" ON "HomePageLink"("branchId");

-- AddForeignKey
ALTER TABLE "HomePageLink" ADD CONSTRAINT "HomePageLink_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomePageLink" ADD CONSTRAINT "HomePageLink_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomePageLink" ADD CONSTRAINT "HomePageLink_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
