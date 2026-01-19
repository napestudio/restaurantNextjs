-- Migrate existing printer data to systemName field
-- Add systemName column if it doesn't exist
ALTER TABLE "Printer" ADD COLUMN IF NOT EXISTS "systemName" TEXT;

-- Populate systemName from ipAddress for NETWORK printers
UPDATE "Printer"
SET "systemName" = "ipAddress"
WHERE "connectionType" = 'NETWORK' AND "ipAddress" IS NOT NULL;

-- Set placeholder for USB printers or any without ipAddress
UPDATE "Printer"
SET "systemName" = 'NEEDS_RECONFIGURATION'
WHERE "systemName" IS NULL;

-- Make systemName NOT NULL with default
ALTER TABLE "Printer" ALTER COLUMN "systemName" SET NOT NULL;
ALTER TABLE "Printer" ALTER COLUMN "systemName" SET DEFAULT 'NEEDS_RECONFIGURATION';
