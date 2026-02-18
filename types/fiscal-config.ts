export interface FiscalConfigData {
  // Fiscal identity (from FiscalConfigInput)
  businessName: string;
  cuit: string;
  address?: string | null;
  activityStartDate?: Date | null;
  grossIncome?: string | null;
  taxStatus?:
    | "Responsable Inscripto"
    | "Monotributo"
    | "Exento"
    | "No Responsable"
    | "Consumidor Final"
    | null;

  // ARCA credentials
  environment: "test" | "production";
  certificatePath?: string | null;
  privateKeyPath?: string | null;

  // Sales points
  defaultPtoVta: number;

  // Invoice behavior
  defaultInvoiceType: number;
  autoIssue: boolean;

  // Status
  isEnabled: boolean;

  // Read-only fields from database
  id?: string;
  restaurantId?: string;
  availablePtoVta?: number[] | null;
  lastSyncedAt?: Date | null;
  certificateExpiresAt?: Date | null;
  lastTestedAt?: Date | null;
  lastTestSuccess?: boolean | null;
  lastTestError?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
}
