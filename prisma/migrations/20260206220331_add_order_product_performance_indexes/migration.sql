-- CreateIndex
CREATE INDEX "Order_branchId_type_idx" ON "Order"("branchId", "type");

-- CreateIndex
CREATE INDEX "ProductOnBranch_branchId_isActive_idx" ON "ProductOnBranch"("branchId", "isActive");
