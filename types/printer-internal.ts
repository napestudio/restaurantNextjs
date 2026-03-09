// Internal types shared between Printer.ts and PrinterActions.ts actions

export interface OrderItemForPrint {
  productId: string;
  itemName: string;
  quantity: number;
  notes?: string | null;
  categoryId?: string | null;
}

export interface OrderInfoForPrint {
  orderId: string;
  orderCode: string;
  tableName: string;
  branchId: string;
}

export interface ControlTicketItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string | null;
}

export interface ControlTicketInfo {
  orderId: string;
  orderCode: string;
  tableName: string;
  waiterName?: string;
  branchId: string;
  items: ControlTicketItem[];
  subtotal: number;
  discountPercentage?: number;
  deliveryFee?: number;
  payments?: Array<{ method: string; amount: number }>;
  orderType?: string;
  customerName?: string;
  clientPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryNotes?: string | null;
  paymentMethod?: string;
  orderCreatedAt?: string;
}
