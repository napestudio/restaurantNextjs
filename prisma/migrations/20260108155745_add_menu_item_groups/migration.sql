-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "menuItemGroupId" TEXT;

-- CreateTable
CREATE TABLE "MenuItemGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "menuSectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuItemGroup_menuSectionId_order_idx" ON "MenuItemGroup"("menuSectionId", "order");

-- CreateIndex
CREATE INDEX "MenuItem_menuItemGroupId_order_idx" ON "MenuItem"("menuItemGroupId", "order");

-- AddForeignKey
ALTER TABLE "MenuItemGroup" ADD CONSTRAINT "MenuItemGroup_menuSectionId_fkey" FOREIGN KEY ("menuSectionId") REFERENCES "MenuSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_menuItemGroupId_fkey" FOREIGN KEY ("menuItemGroupId") REFERENCES "MenuItemGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
