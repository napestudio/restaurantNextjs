import type { OrderStatus, OrderType } from "@/app/generated/prisma";
import type { ClientData } from "@/actions/clients";

export type Order = {
  id: string;
  publicCode: string;

  // Core
  type: OrderType;
  status: OrderStatus;
  createdAt: Date;

  // Customer (guest order data)
  customerName: string | null;
  customerEmail: string | null;
  partySize: number | null;
  description: string | null;

  // Delivery
  courierName: string | null;

  // Relations
  tableId: string | null;
  assignedToId: string | null;

  // Billing
  paymentMethod: string;
  discountPercentage: number;
  needsInvoice: boolean;

  // Table relation
  table: {
    number: number;
    name: string | null;
    sectorId: string | null; // ✅ REQUIRED (business critical)
  } | null;

  // Client relation
  client: ClientData | null;

  // Staff relation
  assignedTo: {
    id: string;
    name: string | null;
    username: string;
  } | null;

  // Items
  items: Array<{
    id: string;
    itemName: string;
    quantity: number;
    price: number;
    originalPrice: number | null;

    product: {
      name: string;
      categoryId: string | null;
    } | null;
  }>;

  // Invoices
  invoices?: Array<{
    id: string;
    status: string;
  }>;
};

export type OrderItemInput = {
  productId: string;
  itemName: string;
  quantity: number;
  price: number;
  originalPrice: number;
  notes?: string;
};

export type OrderFilters = {
  branchId: string;
  startDate?: Date;
  endDate?: Date;
  status?: OrderStatus;
  tableId?: string;
  type?: OrderType;
  search?: string;
  page?: number;
  pageSize?: number;
};

// Payment method type for closing tables (extended)
export type PaymentMethodExtended =
  | "CASH"
  | "CARD_DEBIT"
  | "CARD_CREDIT"
  | "ACCOUNT"
  | "TRANSFER";

// Payment entry for split payments
export type PaymentEntry = {
  method: PaymentMethodExtended;
  amount: number;
};

export type OrderWithoutInvoice = {
  id: string;
  publicCode: string;
  customerName: string | null;
  table: { name: string | null; number: number } | null;
  type: OrderType;
  total: number;
};
