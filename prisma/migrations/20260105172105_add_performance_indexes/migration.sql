-- AlterTable
ALTER TABLE "Printer" ADD COLUMN     "controlTicketFontSize" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "controlTicketSpacing" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Order_branchId_status_idx" ON "Order"("branchId", "status");

-- CreateIndex
CREATE INDEX "Order_branchId_createdAt_idx" ON "Order"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "ProductOnBranch_productId_idx" ON "ProductOnBranch"("productId");
