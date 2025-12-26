-- AlterTable
ALTER TABLE "Printer" ADD COLUMN     "ticketFooter" TEXT,
ADD COLUMN     "ticketFooterSize" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ticketHeader" TEXT,
ADD COLUMN     "ticketHeaderSize" INTEGER NOT NULL DEFAULT 1;
