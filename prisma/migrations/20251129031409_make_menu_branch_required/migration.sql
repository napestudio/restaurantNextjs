/*
  Warnings:

  - Made the column `branchId` on table `Menu` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Menu" ALTER COLUMN "branchId" SET NOT NULL;
