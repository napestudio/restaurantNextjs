-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryAddressApartment" TEXT,
ADD COLUMN     "deliveryAddressCity" TEXT,
ADD COLUMN     "deliveryAddressNumber" TEXT,
ADD COLUMN     "deliveryAddressStreet" TEXT,
ADD COLUMN     "deliveryPhone" TEXT,
ADD COLUMN     "deliveryWindowId" TEXT;

-- CreateTable
CREATE TABLE "DeliveryConfig" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "menuId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minOrderAmount" DECIMAL(10,2) DEFAULT 0,
    "deliveryFee" DECIMAL(10,2) DEFAULT 0,
    "estimatedMinutes" INTEGER DEFAULT 45,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryWindow" (
    "id" TEXT NOT NULL,
    "deliveryConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "daysOfWeek" TEXT[],
    "maxOrders" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryConfig_branchId_key" ON "DeliveryConfig"("branchId");

-- CreateIndex
CREATE INDEX "DeliveryConfig_branchId_idx" ON "DeliveryConfig"("branchId");

-- CreateIndex
CREATE INDEX "DeliveryWindow_deliveryConfigId_idx" ON "DeliveryWindow"("deliveryConfigId");

-- AddForeignKey
ALTER TABLE "DeliveryConfig" ADD CONSTRAINT "DeliveryConfig_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryConfig" ADD CONSTRAINT "DeliveryConfig_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryWindow" ADD CONSTRAINT "DeliveryWindow_deliveryConfigId_fkey" FOREIGN KEY ("deliveryConfigId") REFERENCES "DeliveryConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryWindowId_fkey" FOREIGN KEY ("deliveryWindowId") REFERENCES "DeliveryWindow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
