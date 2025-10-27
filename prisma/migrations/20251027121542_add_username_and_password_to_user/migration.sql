-- AlterTable: Add username and password columns to User table
-- Step 1: Add nullable columns first
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "password" TEXT;

-- Step 2: Make email nullable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Step 3: For existing users, generate username from email
UPDATE "User"
SET "username" = SPLIT_PART("email", '@', 1)
WHERE "username" IS NULL AND "email" IS NOT NULL;

-- Step 4: Handle edge case - if username is still null (shouldn't happen but safety first)
UPDATE "User"
SET "username" = 'user_' || "id"
WHERE "username" IS NULL;

-- Step 5: Now make username required and add unique constraint
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Step 6: Drop the old email unique constraint and recreate it to allow nulls
DROP INDEX IF EXISTS "User_email_key";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email") WHERE "email" IS NOT NULL;
