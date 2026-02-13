// CSV Import Types

export type CSVImportMode = "update-or-create" | "create-only";

export type CSVImportRow = {
  Nombre: string;
  SKU?: string;
  Categoría?: string;
  Stock?: string;
  "Stock Mínimo"?: string;
  "Precio Comedor"?: string;
  "Precio Para Llevar"?: string;
  "Precio Delivery"?: string;
  "Tipo de Unidad"?: string;
  Descripción?: string;
  Activo?: string;
};

export type CSVImportInput = {
  restaurantId: string;
  branchId: string;
  rows: CSVImportRow[];
  mode: CSVImportMode;
};

export type CSVImportError = {
  row: number;
  product: string;
  field?: string;
  message: string;
  severity: "error" | "warning";
};

export type CSVImportResult = {
  success: boolean;
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errors: CSVImportError[];
};

export type ValidationError = {
  field: string;
  message: string;
  severity: "error" | "warning";
};
