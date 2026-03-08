ALTER TABLE "CashMovement"
  ALTER COLUMN "amount" TYPE DECIMAL(10,2)
  USING ROUND("amount"::NUMERIC, 2)::DECIMAL(10,2);

ALTER TABLE "CashRegisterSession"
  ALTER COLUMN "openingAmount" TYPE DECIMAL(10,2)
  USING ROUND("openingAmount"::NUMERIC, 2)::DECIMAL(10,2);

ALTER TABLE "CashRegisterSession"
  ALTER COLUMN "expectedCash" TYPE DECIMAL(10,2)
  USING ROUND("expectedCash"::NUMERIC, 2)::DECIMAL(10,2);

ALTER TABLE "CashRegisterSession"
  ALTER COLUMN "countedCash" TYPE DECIMAL(10,2)
  USING ROUND("countedCash"::NUMERIC, 2)::DECIMAL(10,2);

ALTER TABLE "CashRegisterSession"
  ALTER COLUMN "variance" TYPE DECIMAL(10,2)
  USING ROUND("variance"::NUMERIC, 2)::DECIMAL(10,2);
