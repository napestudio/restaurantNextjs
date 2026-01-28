/*
  Warnings:

  - You are about to drop the column `cuit` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `customItem` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `Printer` table. All the data in the column will be lost.
  - You are about to drop the column `port` on the `Printer` table. All the data in the column will be lost.
  - Added the required column `customerDocNumber` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerDocType` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerName` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoiceDate` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoiceNumber` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoiceType` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ptoVta` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vatAmount` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'EMITTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "PrinterConnectionType" AS ENUM ('NETWORK', 'USB');

-- DropIndex
DROP INDEX "Printer_branchId_ipAddress_key";

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "taxIdType" INTEGER;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "cuit",
DROP COLUMN "customItem",
DROP COLUMN "description",
DROP COLUMN "name",
ADD COLUMN     "afipResponse" JSONB,
ADD COLUMN     "cae" TEXT,
ADD COLUMN     "caeFchVto" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "customerDocNumber" TEXT NOT NULL,
ADD COLUMN     "customerDocType" INTEGER NOT NULL,
ADD COLUMN     "customerName" TEXT NOT NULL,
ADD COLUMN     "invoiceDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "invoiceNumber" INTEGER NOT NULL,
ADD COLUMN     "invoiceType" INTEGER NOT NULL,
ADD COLUMN     "ptoVta" INTEGER NOT NULL,
ADD COLUMN     "qrUrl" TEXT,
ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "subtotal" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "totalAmount" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "vatAmount" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "vatBreakdown" JSONB;

-- AlterTable
ALTER TABLE "Printer" DROP COLUMN "ipAddress",
DROP COLUMN "port",
ADD COLUMN     "connectionType" "PrinterConnectionType" NOT NULL DEFAULT 'NETWORK',
ADD COLUMN     "systemName" TEXT NOT NULL DEFAULT 'NEEDS_RECONFIGURATION';

-- AlterTable
ALTER TABLE "TimeSlot" ADD COLUMN     "customerLimit" INTEGER;

-- AlterTable
ALTER TABLE "TimeSlotTable" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isExclusive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "FiscalConfiguration" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "address" TEXT,
    "activityStartDate" TIMESTAMP(3),
    "grossIncome" TEXT,
    "taxStatus" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'test',
    "certificatePath" TEXT,
    "privateKeyPath" TEXT,
    "certificateExpiresAt" TIMESTAMP(3),
    "defaultPtoVta" INTEGER NOT NULL DEFAULT 1,
    "availablePtoVta" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "defaultInvoiceType" INTEGER NOT NULL DEFAULT 6,
    "autoIssue" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestSuccess" BOOLEAN,
    "lastTestError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "FiscalConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalConfiguration_restaurantId_key" ON "FiscalConfiguration"("restaurantId");

-- CreateIndex
CREATE INDEX "FiscalConfiguration_restaurantId_idx" ON "FiscalConfiguration"("restaurantId");

-- CreateIndex
CREATE INDEX "FiscalConfiguration_cuit_idx" ON "FiscalConfiguration"("cuit");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_ptoVta_invoiceType_invoiceNumber_idx" ON "Invoice"("ptoVta", "invoiceType", "invoiceNumber");

-- CreateIndex
CREATE INDEX "Printer_connectionType_idx" ON "Printer"("connectionType");

-- AddForeignKey
ALTER TABLE "FiscalConfiguration" ADD CONSTRAINT "FiscalConfiguration_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
