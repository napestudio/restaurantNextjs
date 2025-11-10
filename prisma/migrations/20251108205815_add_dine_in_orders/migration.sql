-- AlterEnum
ALTER TYPE "public"."OrderType" ADD VALUE 'DINE_IN';

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "partySize" INTEGER,
ADD COLUMN     "tableId" TEXT,
ALTER COLUMN "customerName" DROP NOT NULL,
ALTER COLUMN "customerEmail" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."OrderItem" ADD COLUMN     "originalPrice" DECIMAL(65,30);

-- CreateIndex
CREATE INDEX "Order_tableId_idx" ON "public"."Order"("tableId");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;
