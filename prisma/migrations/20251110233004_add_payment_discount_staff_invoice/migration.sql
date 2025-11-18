-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER');

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "discountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "needsInvoice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMethod" "public"."PaymentMethod" NOT NULL DEFAULT 'CASH';

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cuit" TEXT,
    "description" TEXT,
    "customItem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "public"."Invoice"("orderId");

-- CreateIndex
CREATE INDEX "Order_assignedToId_idx" ON "public"."Order"("assignedToId");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
