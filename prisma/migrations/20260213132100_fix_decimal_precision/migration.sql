-- AlterTable
ALTER TABLE "TimeSlot" ALTER COLUMN "pricePerPerson" TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "minStockAlert" TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ProductOnBranch" ALTER COLUMN "stock" TYPE DECIMAL(10,2),
ALTER COLUMN "minStock" TYPE DECIMAL(10,2),
ALTER COLUMN "maxStock" TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ProductPrice" ALTER COLUMN "price" TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "StockMovement" ALTER COLUMN "quantity" TYPE DECIMAL(10,2),
ALTER COLUMN "previousStock" TYPE DECIMAL(10,2),
ALTER COLUMN "newStock" TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "price" TYPE DECIMAL(10,2),
ALTER COLUMN "originalPrice" TYPE DECIMAL(10,2);
