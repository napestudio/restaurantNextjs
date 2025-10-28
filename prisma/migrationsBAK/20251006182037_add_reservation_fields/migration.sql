-- AlterTable
ALTER TABLE "public"."Reservation" ADD COLUMN     "accessibilityNeeds" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "dietaryRestrictions" TEXT,
ADD COLUMN     "notes" TEXT;
