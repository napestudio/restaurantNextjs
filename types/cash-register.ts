import type {
  CashRegister,
  CashRegisterSession,
  CashMovement,
  Sector,
  CashRegisterStatus,
  CashMovementType,
  PaymentMethodExtended,
  CashRegisterOnSector,
} from "@/app/generated/prisma";

// Re-export enums for convenience
export type { CashRegisterStatus, CashMovementType, PaymentMethodExtended };

// Sector info for display
export type SectorInfo = Pick<Sector, "id" | "name" | "color">;

// Serialized session for client components (Decimal -> number, Date -> string)
export interface SerializedCashRegisterSession {
  id: string;
  cashRegisterId: string;
  status: CashRegisterStatus;
  openedAt: string;
  openedBy: string;
  openingAmount: number;
  closedAt: string | null;
  closedBy: string | null;
  expectedCash: number | null;
  countedCash: number | null;
  variance: number | null;
  closingNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Cash Register sector junction with included sector
export interface CashRegisterSectorWithDetails {
  id: string;
  cashRegisterId: string;
  sectorId: string;
  createdAt: Date | string;
  sector: SectorInfo;
}

// Cash Register with relations (many-to-many sectors)
export interface CashRegisterWithRelations extends CashRegister {
  sectors: CashRegisterSectorWithDetails[];
  sessions: CashRegisterSession[];
  _count: {
    sessions: number;
  };
}

// Cash Register with current session info (for client components with serialized data)
export interface CashRegisterWithStatus {
  id: string;
  name: string;
  isActive: boolean;
  branchId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  sectors: CashRegisterSectorWithDetails[];
  sessions: SerializedCashRegisterSession[]; // Serialized sessions
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
  sectorIds: string[];
}

// Form state for editing cash register
export interface EditCashRegisterForm {
  name: string;
  sectorIds: string[];
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

// Payment methods array for select dropdowns
export const PAYMENT_METHODS: { value: PaymentMethodExtended; label: string }[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "CARD_DEBIT", label: "Tarjeta Débito" },
  { value: "CARD_CREDIT", label: "Tarjeta Crédito" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "ACCOUNT", label: "Cuenta Corriente" },
];

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
