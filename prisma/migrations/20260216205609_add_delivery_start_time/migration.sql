/*
  Warnings:

  - Added the required column `deliveryStartTime` to the `DeliveryWindow` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DeliveryWindow" ADD COLUMN     "deliveryStartTime" TIME NOT NULL;
