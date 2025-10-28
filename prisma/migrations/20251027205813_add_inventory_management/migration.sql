/*
  Warnings:

  - A unique constraint covering the columns `[restaurantId,sku]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."UnitType" AS ENUM ('UNIT', 'WEIGHT', 'VOLUME');

-- CreateEnum
CREATE TYPE "public"."WeightUnit" AS ENUM ('KILOGRAM', 'GRAM', 'POUND', 'OUNCE');

-- CreateEnum
CREATE TYPE "public"."VolumeUnit" AS ENUM ('LITER', 'MILLILITER', 'GALLON', 'FLUID_OUNCE');

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "minStockAlert" DECIMAL(65,30),
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "unitType" "public"."UnitType" NOT NULL DEFAULT 'UNIT',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "volumeUnit" "public"."VolumeUnit",
ADD COLUMN     "weightUnit" "public"."WeightUnit";

-- AlterTable
ALTER TABLE "public"."ProductOnBranch" ADD COLUMN     "lastRestocked" TIMESTAMP(3),
ADD COLUMN     "maxStock" DECIMAL(65,30),
ADD COLUMN     "minStock" DECIMAL(65,30),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "stock" SET DEFAULT 0,
ALTER COLUMN "stock" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "public"."StockMovement" (
    "id" TEXT NOT NULL,
    "productOnBranchId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "previousStock" DECIMAL(65,30) NOT NULL,
    "newStock" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_productOnBranchId_idx" ON "public"."StockMovement"("productOnBranchId");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "public"."StockMovement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_restaurantId_sku_key" ON "public"."Product"("restaurantId", "sku");

-- CreateIndex
CREATE INDEX "ProductOnBranch_branchId_idx" ON "public"."ProductOnBranch"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_productOnBranchId_fkey" FOREIGN KEY ("productOnBranchId") REFERENCES "public"."ProductOnBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
