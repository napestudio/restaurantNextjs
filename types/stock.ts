export type AdjustStockInput = {
  productOnBranchId: string;
  quantity: number; // Positivo = entrada, Negativo = salida
  reason: string;
  notes?: string;
  reference?: string;
  createdBy?: string;
};

export type StockMovementFilter = {
  productOnBranchId?: string;
  branchId?: string;
  startDate?: Date;
  endDate?: Date;
  reason?: string;
};
