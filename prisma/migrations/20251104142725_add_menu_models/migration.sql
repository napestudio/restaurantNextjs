-- CreateTable
CREATE TABLE "public"."Menu" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" CITEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "availableFrom" TIME,
    "availableUntil" TIME,
    "daysOfWeek" TEXT[],
    "restaurantId" TEXT NOT NULL,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MenuSection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "menuId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MenuItem" (
    "id" TEXT NOT NULL,
    "menuSectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "customPrice" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Menu_restaurantId_isActive_idx" ON "public"."Menu"("restaurantId", "isActive");

-- CreateIndex
CREATE INDEX "Menu_branchId_idx" ON "public"."Menu"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_restaurantId_slug_key" ON "public"."Menu"("restaurantId", "slug");

-- CreateIndex
CREATE INDEX "MenuSection_menuId_order_idx" ON "public"."MenuSection"("menuId", "order");

-- CreateIndex
CREATE INDEX "MenuItem_menuSectionId_order_idx" ON "public"."MenuItem"("menuSectionId", "order");

-- CreateIndex
CREATE INDEX "MenuItem_productId_idx" ON "public"."MenuItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_menuSectionId_productId_key" ON "public"."MenuItem"("menuSectionId", "productId");

-- AddForeignKey
ALTER TABLE "public"."Menu" ADD CONSTRAINT "Menu_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Menu" ADD CONSTRAINT "Menu_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuSection" ADD CONSTRAINT "MenuSection_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "public"."Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItem" ADD CONSTRAINT "MenuItem_menuSectionId_fkey" FOREIGN KEY ("menuSectionId") REFERENCES "public"."MenuSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItem" ADD CONSTRAINT "MenuItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
