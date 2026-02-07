-- CreateIndex
CREATE INDEX "Client_branchId_email_idx" ON "Client"("branchId", "email");

-- CreateIndex
CREATE INDEX "DeliveryWindow_deliveryConfigId_isActive_idx" ON "DeliveryWindow"("deliveryConfigId", "isActive");

-- CreateIndex
CREATE INDEX "Order_deliveryWindowId_idx" ON "Order"("deliveryWindowId");

-- CreateIndex
CREATE INDEX "Order_type_status_idx" ON "Order"("type", "status");
