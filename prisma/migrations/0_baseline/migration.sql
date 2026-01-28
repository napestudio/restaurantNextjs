-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public" VERSION "1.6";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog" VERSION "1.0";

-- CreateEnum
CREATE TYPE "public"."CashMovementType" AS ENUM ('INCOME', 'EXPENSE', 'SALE', 'REFUND');

-- CreateEnum
CREATE TYPE "public"."CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('PENDING', 'EMITTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."OrderType" AS ENUM ('TAKE_AWAY', 'DELIVERY', 'DINE_IN');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER');

-- CreateEnum
CREATE TYPE "public"."PaymentMethodExtended" AS ENUM ('CASH', 'CARD_DEBIT', 'CARD_CREDIT', 'ACCOUNT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "public"."PriceType" AS ENUM ('DINE_IN', 'TAKE_AWAY', 'DELIVERY');

-- CreateEnum
CREATE TYPE "public"."PrintJobStatus" AS ENUM ('PENDING', 'SENT', 'CONFIRMED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."PrintMode" AS ENUM ('STATION_ITEMS', 'FULL_ORDER', 'BOTH');

-- CreateEnum
CREATE TYPE "public"."PrinterConnectionType" AS ENUM ('NETWORK', 'USB');

-- CreateEnum
CREATE TYPE "public"."PrinterStatus" AS ENUM ('ONLINE', 'OFFLINE', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "public"."TableShape" AS ENUM ('SQUARE', 'RECTANGLE', 'CIRCLE', 'WIDE');

-- CreateEnum
CREATE TYPE "public"."TableStatus" AS ENUM ('EMPTY', 'OCCUPIED', 'RESERVED', 'CLEANING');

-- CreateEnum
CREATE TYPE "public"."UnitType" AS ENUM ('UNIT', 'WEIGHT', 'VOLUME');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'WAITER');

-- CreateEnum
CREATE TYPE "public"."VolumeUnit" AS ENUM ('LITER', 'MILLILITER', 'GALLON', 'FLUID_OUNCE');

-- CreateEnum
CREATE TYPE "public"."WeightUnit" AS ENUM ('KILOGRAM', 'GRAM', 'POUND', 'OUNCE');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slug" CITEXT,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CashMovement" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "public"."CashMovementType" NOT NULL,
    "paymentMethod" "public"."PaymentMethodExtended" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CashRegister" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CashRegisterOnSector" (
    "id" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashRegisterOnSector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CashRegisterSession" (
    "id" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    "status" "public"."CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedBy" TEXT NOT NULL,
    "openingAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "expectedCash" DECIMAL(65,30),
    "countedCash" DECIMAL(65,30),
    "variance" DECIMAL(65,30),
    "closingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashRegisterSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "restaurantId" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Client" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "birthDate" TIMESTAMP(3),
    "taxId" TEXT,
    "notes" TEXT,
    "addressStreet" TEXT,
    "addressNumber" TEXT,
    "addressApartment" TEXT,
    "addressCity" TEXT,
    "discountPercentage" DECIMAL(5,2) DEFAULT 0,
    "preferredPaymentMethod" "public"."PaymentMethod",
    "hasCurrentAccount" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "taxIdType" INTEGER,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FiscalConfiguration" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "address" TEXT,
    "activityStartDate" TIMESTAMP(3),
    "grossIncome" TEXT,
    "taxStatus" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'test',
    "certificatePath" TEXT,
    "privateKeyPath" TEXT,
    "certificateExpiresAt" TIMESTAMP(3),
    "defaultPtoVta" INTEGER NOT NULL DEFAULT 1,
    "availablePtoVta" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "defaultInvoiceType" INTEGER NOT NULL DEFAULT 6,
    "autoIssue" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestSuccess" BOOLEAN,
    "lastTestError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "FiscalConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "afipResponse" JSONB,
    "cae" TEXT,
    "caeFchVto" TEXT,
    "createdBy" TEXT,
    "customerDocNumber" TEXT NOT NULL,
    "customerDocType" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "invoiceNumber" INTEGER NOT NULL,
    "invoiceType" INTEGER NOT NULL,
    "ptoVta" INTEGER NOT NULL,
    "qrUrl" TEXT,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL,
    "vatBreakdown" JSONB,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Menu" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" CITEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "availableFrom" TIME(6),
    "availableUntil" TIME(6),
    "daysOfWeek" TEXT[],
    "restaurantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "showPrices" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
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
    "menuItemGroupId" TEXT,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MenuItemGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "menuSectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemGroup_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "type" "public"."OrderType" NOT NULL,
    "description" TEXT,
    "courierName" TEXT,
    "publicCode" TEXT NOT NULL,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "partySize" INTEGER,
    "tableId" TEXT,
    "assignedToId" TEXT,
    "discountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "needsInvoice" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" "public"."PaymentMethod" NOT NULL DEFAULT 'CASH',
    "clientId" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "originalPrice" DECIMAL(65,30),
    "notes" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PrintJob" (
    "id" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "orderId" TEXT,
    "content" TEXT NOT NULL,
    "jobType" TEXT NOT NULL DEFAULT 'ORDER',
    "status" "public"."PrintJobStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Printer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "model" TEXT,
    "status" "public"."PrinterStatus" NOT NULL DEFAULT 'OFFLINE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoPrint" BOOLEAN NOT NULL DEFAULT true,
    "printCopies" INTEGER NOT NULL DEFAULT 1,
    "paperWidth" INTEGER NOT NULL DEFAULT 80,
    "charactersPerLine" INTEGER NOT NULL DEFAULT 48,
    "stationId" TEXT,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "printMode" "public"."PrintMode" NOT NULL DEFAULT 'STATION_ITEMS',
    "ticketFooter" TEXT,
    "ticketFooterSize" INTEGER NOT NULL DEFAULT 1,
    "ticketHeader" TEXT,
    "ticketHeaderSize" INTEGER NOT NULL DEFAULT 2,
    "controlTicketFontSize" INTEGER NOT NULL DEFAULT 1,
    "controlTicketSpacing" INTEGER NOT NULL DEFAULT 1,
    "connectionType" "public"."PrinterConnectionType" NOT NULL DEFAULT 'NETWORK',
    "systemName" TEXT NOT NULL DEFAULT 'NEEDS_RECONFIGURATION',

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sku" TEXT,
    "unitType" "public"."UnitType" NOT NULL DEFAULT 'UNIT',
    "weightUnit" "public"."WeightUnit",
    "volumeUnit" "public"."VolumeUnit",
    "minStockAlert" DECIMAL(65,30),
    "trackStock" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT NOT NULL,
    "categoryId" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductOnBranch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "stock" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(65,30),
    "maxStock" DECIMAL(65,30),
    "lastRestocked" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductOnBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductPrice" (
    "id" TEXT NOT NULL,
    "productOnBranchId" TEXT NOT NULL,
    "type" "public"."PriceType" NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reservation" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "people" INTEGER NOT NULL,
    "timeSlotId" TEXT,
    "exactTime" TIMESTAMP(3),
    "status" "public"."ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "dietaryRestrictions" TEXT,
    "accessibilityNeeds" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReservationTable" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,

    CONSTRAINT "ReservationTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReservedSlug" (
    "slug" CITEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservedSlug_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "public"."Restaurant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" CITEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'Argentina',
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "linkedinUrl" TEXT,
    "postalCode" TEXT,
    "state" TEXT,
    "tiktokUrl" TEXT,
    "twitterUrl" TEXT,
    "websiteUrl" TEXT,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "order" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 1200,
    "height" INTEGER NOT NULL DEFAULT 800,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Station" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StationCategory" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationCategory_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."Table" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "positionX" DOUBLE PRECISION DEFAULT 0,
    "positionY" DOUBLE PRECISION DEFAULT 0,
    "width" DOUBLE PRECISION DEFAULT 100,
    "height" DOUBLE PRECISION DEFAULT 100,
    "rotation" DOUBLE PRECISION DEFAULT 0,
    "shape" "public"."TableShape" DEFAULT 'SQUARE',
    "status" "public"."TableStatus",
    "branchId" TEXT NOT NULL,
    "sectorId" TEXT,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TimeSlot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TIME(6) NOT NULL,
    "endTime" TIME(6) NOT NULL,
    "daysOfWeek" TEXT[],
    "pricePerPerson" DECIMAL(65,30) DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "moreInfoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerLimit" INTEGER,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TimeSlotTable" (
    "id" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isExclusive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TimeSlotTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserOnBranch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserOnBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_restaurantId_name_key" ON "public"."Branch"("restaurantId" ASC, "name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_restaurantId_slug_key" ON "public"."Branch"("restaurantId" ASC, "slug" ASC);

-- CreateIndex
CREATE INDEX "CashMovement_orderId_idx" ON "public"."CashMovement"("orderId" ASC);

-- CreateIndex
CREATE INDEX "CashMovement_sessionId_idx" ON "public"."CashMovement"("sessionId" ASC);

-- CreateIndex
CREATE INDEX "CashMovement_type_idx" ON "public"."CashMovement"("type" ASC);

-- CreateIndex
CREATE INDEX "CashRegister_branchId_idx" ON "public"."CashRegister"("branchId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CashRegister_branchId_name_key" ON "public"."CashRegister"("branchId" ASC, "name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CashRegisterOnSector_cashRegisterId_sectorId_key" ON "public"."CashRegisterOnSector"("cashRegisterId" ASC, "sectorId" ASC);

-- CreateIndex
CREATE INDEX "CashRegisterOnSector_sectorId_idx" ON "public"."CashRegisterOnSector"("sectorId" ASC);

-- CreateIndex
CREATE INDEX "CashRegisterSession_cashRegisterId_idx" ON "public"."CashRegisterSession"("cashRegisterId" ASC);

-- CreateIndex
CREATE INDEX "CashRegisterSession_openedAt_idx" ON "public"."CashRegisterSession"("openedAt" ASC);

-- CreateIndex
CREATE INDEX "CashRegisterSession_status_idx" ON "public"."CashRegisterSession"("status" ASC);

-- CreateIndex
CREATE INDEX "Category_restaurantId_idx" ON "public"."Category"("restaurantId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Category_restaurantId_name_key" ON "public"."Category"("restaurantId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "Client_branchId_idx" ON "public"."Client"("branchId" ASC);

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "public"."Client"("name" ASC);

-- CreateIndex
CREATE INDEX "Client_phone_idx" ON "public"."Client"("phone" ASC);

-- CreateIndex
CREATE INDEX "FiscalConfiguration_cuit_idx" ON "public"."FiscalConfiguration"("cuit" ASC);

-- CreateIndex
CREATE INDEX "FiscalConfiguration_restaurantId_idx" ON "public"."FiscalConfiguration"("restaurantId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalConfiguration_restaurantId_key" ON "public"."FiscalConfiguration"("restaurantId" ASC);

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "public"."Invoice"("invoiceDate" ASC);

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "public"."Invoice"("orderId" ASC);

-- CreateIndex
CREATE INDEX "Invoice_ptoVta_invoiceType_invoiceNumber_idx" ON "public"."Invoice"("ptoVta" ASC, "invoiceType" ASC, "invoiceNumber" ASC);

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "public"."Invoice"("status" ASC);

-- CreateIndex
CREATE INDEX "Menu_branchId_idx" ON "public"."Menu"("branchId" ASC);

-- CreateIndex
CREATE INDEX "Menu_restaurantId_isActive_idx" ON "public"."Menu"("restaurantId" ASC, "isActive" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Menu_restaurantId_slug_key" ON "public"."Menu"("restaurantId" ASC, "slug" ASC);

-- CreateIndex
CREATE INDEX "MenuItem_menuItemGroupId_order_idx" ON "public"."MenuItem"("menuItemGroupId" ASC, "order" ASC);

-- CreateIndex
CREATE INDEX "MenuItem_menuSectionId_order_idx" ON "public"."MenuItem"("menuSectionId" ASC, "order" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_menuSectionId_productId_key" ON "public"."MenuItem"("menuSectionId" ASC, "productId" ASC);

-- CreateIndex
CREATE INDEX "MenuItem_productId_idx" ON "public"."MenuItem"("productId" ASC);

-- CreateIndex
CREATE INDEX "MenuItemGroup_menuSectionId_order_idx" ON "public"."MenuItemGroup"("menuSectionId" ASC, "order" ASC);

-- CreateIndex
CREATE INDEX "MenuSection_menuId_order_idx" ON "public"."MenuSection"("menuId" ASC, "order" ASC);

-- CreateIndex
CREATE INDEX "Order_assignedToId_idx" ON "public"."Order"("assignedToId" ASC);

-- CreateIndex
CREATE INDEX "Order_branchId_createdAt_idx" ON "public"."Order"("branchId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Order_branchId_status_idx" ON "public"."Order"("branchId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "Order_clientId_idx" ON "public"."Order"("clientId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Order_publicCode_key" ON "public"."Order"("publicCode" ASC);

-- CreateIndex
CREATE INDEX "Order_tableId_idx" ON "public"."Order"("tableId" ASC);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId" ASC);

-- CreateIndex
CREATE INDEX "PrintJob_createdAt_idx" ON "public"."PrintJob"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "PrintJob_orderId_idx" ON "public"."PrintJob"("orderId" ASC);

-- CreateIndex
CREATE INDEX "PrintJob_printerId_idx" ON "public"."PrintJob"("printerId" ASC);

-- CreateIndex
CREATE INDEX "PrintJob_status_idx" ON "public"."PrintJob"("status" ASC);

-- CreateIndex
CREATE INDEX "Printer_branchId_idx" ON "public"."Printer"("branchId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Printer_branchId_name_key" ON "public"."Printer"("branchId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "Printer_connectionType_idx" ON "public"."Printer"("connectionType" ASC);

-- CreateIndex
CREATE INDEX "Printer_stationId_idx" ON "public"."Printer"("stationId" ASC);

-- CreateIndex
CREATE INDEX "Product_restaurantId_idx" ON "public"."Product"("restaurantId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Product_restaurantId_name_key" ON "public"."Product"("restaurantId" ASC, "name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Product_restaurantId_sku_key" ON "public"."Product"("restaurantId" ASC, "sku" ASC);

-- CreateIndex
CREATE INDEX "ProductOnBranch_branchId_idx" ON "public"."ProductOnBranch"("branchId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProductOnBranch_productId_branchId_key" ON "public"."ProductOnBranch"("productId" ASC, "branchId" ASC);

-- CreateIndex
CREATE INDEX "ProductOnBranch_productId_idx" ON "public"."ProductOnBranch"("productId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPrice_productOnBranchId_type_key" ON "public"."ProductPrice"("productOnBranchId" ASC, "type" ASC);

-- CreateIndex
CREATE INDEX "Reservation_branchId_date_status_idx" ON "public"."Reservation"("branchId" ASC, "date" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "Reservation_date_timeSlotId_idx" ON "public"."Reservation"("date" ASC, "timeSlotId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ReservationTable_reservationId_tableId_key" ON "public"."ReservationTable"("reservationId" ASC, "tableId" ASC);

-- CreateIndex
CREATE INDEX "ReservationTable_tableId_idx" ON "public"."ReservationTable"("tableId" ASC);

-- CreateIndex
CREATE INDEX "Restaurant_slug_idx" ON "public"."Restaurant"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "public"."Restaurant"("slug" ASC);

-- CreateIndex
CREATE INDEX "Sector_branchId_idx" ON "public"."Sector"("branchId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Sector_branchId_name_key" ON "public"."Sector"("branchId" ASC, "name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken" ASC);

-- CreateIndex
CREATE INDEX "Station_branchId_idx" ON "public"."Station"("branchId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Station_branchId_name_key" ON "public"."Station"("branchId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "StationCategory_categoryId_idx" ON "public"."StationCategory"("categoryId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StationCategory_stationId_categoryId_key" ON "public"."StationCategory"("stationId" ASC, "categoryId" ASC);

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "public"."StockMovement"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "StockMovement_productOnBranchId_idx" ON "public"."StockMovement"("productOnBranchId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Table_branchId_number_key" ON "public"."Table"("branchId" ASC, "number" ASC);

-- CreateIndex
CREATE INDEX "Table_sectorId_idx" ON "public"."Table"("sectorId" ASC);

-- CreateIndex
CREATE INDEX "TimeSlotTable_tableId_idx" ON "public"."TimeSlotTable"("tableId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlotTable_timeSlotId_tableId_key" ON "public"."TimeSlotTable"("timeSlotId" ASC, "tableId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserOnBranch_userId_branchId_key" ON "public"."UserOnBranch"("userId" ASC, "branchId" ASC);

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Branch" ADD CONSTRAINT "Branch_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CashMovement" ADD CONSTRAINT "CashMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CashMovement" ADD CONSTRAINT "CashMovement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."CashRegisterSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CashRegister" ADD CONSTRAINT "CashRegister_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CashRegisterOnSector" ADD CONSTRAINT "CashRegisterOnSector_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "public"."CashRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CashRegisterOnSector" ADD CONSTRAINT "CashRegisterOnSector_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "public"."Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CashRegisterSession" ADD CONSTRAINT "CashRegisterSession_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "public"."CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FiscalConfiguration" ADD CONSTRAINT "FiscalConfiguration_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Menu" ADD CONSTRAINT "Menu_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Menu" ADD CONSTRAINT "Menu_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItem" ADD CONSTRAINT "MenuItem_menuItemGroupId_fkey" FOREIGN KEY ("menuItemGroupId") REFERENCES "public"."MenuItemGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItem" ADD CONSTRAINT "MenuItem_menuSectionId_fkey" FOREIGN KEY ("menuSectionId") REFERENCES "public"."MenuSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItem" ADD CONSTRAINT "MenuItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItemGroup" ADD CONSTRAINT "MenuItemGroup_menuSectionId_fkey" FOREIGN KEY ("menuSectionId") REFERENCES "public"."MenuSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuSection" ADD CONSTRAINT "MenuSection_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "public"."Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrintJob" ADD CONSTRAINT "PrintJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrintJob" ADD CONSTRAINT "PrintJob_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "public"."Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Printer" ADD CONSTRAINT "Printer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Printer" ADD CONSTRAINT "Printer_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductOnBranch" ADD CONSTRAINT "ProductOnBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductOnBranch" ADD CONSTRAINT "ProductOnBranch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductPrice" ADD CONSTRAINT "ProductPrice_productOnBranchId_fkey" FOREIGN KEY ("productOnBranchId") REFERENCES "public"."ProductOnBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reservation" ADD CONSTRAINT "Reservation_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "public"."TimeSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReservationTable" ADD CONSTRAINT "ReservationTable_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReservationTable" ADD CONSTRAINT "ReservationTable_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sector" ADD CONSTRAINT "Sector_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Station" ADD CONSTRAINT "Station_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StationCategory" ADD CONSTRAINT "StationCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StationCategory" ADD CONSTRAINT "StationCategory_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_productOnBranchId_fkey" FOREIGN KEY ("productOnBranchId") REFERENCES "public"."ProductOnBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Table" ADD CONSTRAINT "Table_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Table" ADD CONSTRAINT "Table_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "public"."Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeSlot" ADD CONSTRAINT "TimeSlot_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeSlotTable" ADD CONSTRAINT "TimeSlotTable_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeSlotTable" ADD CONSTRAINT "TimeSlotTable_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "public"."TimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserOnBranch" ADD CONSTRAINT "UserOnBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserOnBranch" ADD CONSTRAINT "UserOnBranch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

