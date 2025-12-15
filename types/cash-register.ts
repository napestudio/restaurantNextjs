import type {
  CashRegister,
  CashRegisterSession,
  CashMovement,
  Sector,
  CashRegisterStatus,
  CashMovementType,
  PaymentMethodExtended,
} from "@/app/generated/prisma";

// Re-export enums for convenience
export type { CashRegisterStatus, CashMovementType, PaymentMethodExtended };

// Cash Register with relations
export interface CashRegisterWithRelations extends CashRegister {
  sector: Pick<Sector, "id" | "name" | "color"> | null;
  sessions: CashRegisterSession[];
  _count: {
    sessions: number;
  };
}

// Cash Register with current session info
export interface CashRegisterWithStatus extends CashRegister {
  sector: Pick<Sector, "id" | "name" | "color"> | null;
  sessions: CashRegisterSession[]; // Will contain at most 1 OPEN session
  _count: {
    sessions: number;
  };
  hasOpenSession: boolean;
}

// Session with movements
export interface SessionWithMovements extends CashRegisterSession {
  movements: CashMovement[];
}

// Session summary for reports
export interface SessionSummary {
  openingAmount: number;
  expectedCash: number;
  countedCash: number | null;
  variance: number | null;
  totalsByPaymentMethod: Record<
    string,
    { income: number; expense: number; net: number }
  >;
  totalsByType: Record<string, number>;
  movementCount: number;
}

// Movement with order info
export interface MovementWithOrder extends CashMovement {
  order: {
    id: string;
    publicCode: string;
    type: string;
  } | null;
}

// Form state for creating cash register
export interface CreateCashRegisterForm {
  name: string;
  sectorId: string | null;
}

// Form state for editing cash register
export interface EditCashRegisterForm {
  name: string;
  sectorId: string | null;
  isActive: boolean;
}

// Form state for opening session
export interface OpenSessionForm {
  openingAmount: number;
}

// Form state for closing session
export interface CloseSessionForm {
  countedCash: number;
  closingNotes: string;
}

// Form state for adding movement
export interface AddMovementForm {
  type: CashMovementType;
  paymentMethod: PaymentMethodExtended;
  amount: number;
  description: string;
}

// Payment method labels in Spanish
export const PAYMENT_METHOD_LABELS: Record<PaymentMethodExtended, string> = {
  CASH: "Efectivo",
  CARD_DEBIT: "Tarjeta Débito",
  CARD_CREDIT: "Tarjeta Crédito",
  ACCOUNT: "Cuenta Corriente",
  TRANSFER: "Transferencia",
};

// Movement type labels in Spanish
export const MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
  INCOME: "Ingreso",
  EXPENSE: "Egreso",
  SALE: "Venta",
  REFUND: "Devolución",
};

// Cash register status labels in Spanish
export const REGISTER_STATUS_LABELS: Record<CashRegisterStatus, string> = {
  OPEN: "Abierta",
  CLOSED: "Cerrada",
};
