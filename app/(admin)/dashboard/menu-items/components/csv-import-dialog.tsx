"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  X,
} from "lucide-react";
import { parseCSV, generateTemplateCSV } from "@/lib/csv/csv-parser";
import { validateAllRows } from "@/lib/csv/csv-validator";
import { importProductsCSV } from "@/actions/Products";
import type { Category } from "@/app/generated/prisma";
import type {
  CSVImportRow,
  CSVImportMode,
  CSVImportResult,
  ValidationError,
} from "@/lib/csv/csv-types";

type CSVImportDialogProps = {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  branchId: string;
  categories: Category[];
  onSuccess: () => void;
};

type Step = "upload" | "preview" | "importing" | "results";

export function CSVImportDialog({
  open,
  onClose,
  restaurantId,
  branchId,
  categories,
  onSuccess,
}: CSVImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [mode, setMode] = useState<CSVImportMode>("update-or-create");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVImportRow[]>([]);
  const [validationResults, setValidationResults] = useState<{
    validCount: number;
    warningCount: number;
    errorCount: number;
    rowValidations: Map<number, ValidationError[]>;
  } | null>(null);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setStep("upload");
    setMode("update-or-create");
    setFile(null);
    setParsedData([]);
    setValidationResults(null);
    setImportResult(null);
    setError(null);
    onClose();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setError(null);

    // Validate file type
    const validTypes = ["text/csv", "application/vnd.ms-excel"];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      setError("Formato no válido. Solo se permiten archivos CSV.");
      return;
    }

    // Validate file size (5MB)
    const maxBytes = 5 * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setError("El archivo es demasiado grande. El máximo permitido es 5MB.");
      return;
    }

    setFile(selectedFile);

    // Parse CSV
    const parseResult = await parseCSV(selectedFile);

    if (!parseResult.success || !parseResult.data) {
      setError(parseResult.error || "Error al parsear el archivo");
      return;
    }

    setParsedData(parseResult.data);

    // Validate all rows
    const validation = validateAllRows(parseResult.data, categories);
    setValidationResults(validation);

    // Move to preview step
    setStep("preview");
  };

  const handleImport = async () => {
    if (!parsedData.length || !validationResults) return;

    // Filter out rows with errors
    const validRows = parsedData.filter((_, index) => {
      const errors = validationResults.rowValidations.get(index) || [];
      return !errors.some((e) => e.severity === "error");
    });

    if (validRows.length === 0) {
      setError("No hay filas válidas para importar");
      return;
    }

    setStep("importing");
    setError(null);

    try {
      const result = await importProductsCSV({
        restaurantId,
        branchId,
        rows: validRows,
        mode,
      });

      setImportResult(result);
      setStep("results");

      if (result.success && result.summary.created + result.summary.updated > 0) {
        onSuccess();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al importar los productos"
      );
      setStep("preview");
    }
  };

  const handleDownloadTemplate = () => {
    const csv = generateTemplateCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla-productos.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Create a synthetic event
      const syntheticEvent = {
        target: { files: [droppedFile] },
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(syntheticEvent);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Productos desde CSV</DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Seleccione un archivo CSV con los productos a importar"}
            {step === "preview" &&
              "Revise los datos antes de importar"}
            {step === "importing" && "Importando productos..."}
            {step === "results" && "Resultados de la importación"}
          </DialogDescription>
        </DialogHeader>

        {/* Upload Step */}
        {step === "upload" && (
          <div className="space-y-4">
            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Modo de Importación</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="update-or-create"
                    checked={mode === "update-or-create"}
                    onChange={(e) => setMode(e.target.value as CSVImportMode)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">Actualizar o Crear</div>
                    <div className="text-sm text-muted-foreground">
                      Actualiza productos existentes (por SKU/nombre) y crea
                      nuevos
                    </div>
                  </div>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="create-only"
                    checked={mode === "create-only"}
                    onChange={(e) => setMode(e.target.value as CSVImportMode)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">Solo Crear Nuevos</div>
                    <div className="text-sm text-muted-foreground">
                      Solo crea productos nuevos, ignora los existentes
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* File Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">
                Arrastra tu archivo CSV aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-muted-foreground">
                Máximo 5MB • Formato CSV
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Help Text */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm space-y-1">
                  <p className="font-medium">Formato del archivo:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Use el mismo formato del CSV exportado</li>
                    <li>Columnas requeridas: Nombre y al menos un precio</li>
                    <li>Las categorías deben existir previamente</li>
                    <li>Use SKU únicos para identificar productos</li>
                  </ul>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Plantilla CSV
              </Button>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === "preview" && validationResults && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Válidos</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {validationResults.validCount}
                </div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium">Advertencias</span>
                </div>
                <div className="text-2xl font-bold text-yellow-600">
                  {validationResults.warningCount}
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <X className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium">Errores</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {validationResults.errorCount}
                </div>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Nombre</th>
                    <th className="px-3 py-2 text-left font-medium">SKU</th>
                    <th className="px-3 py-2 text-left font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row, index) => {
                    const errors = validationResults.rowValidations.get(index) || [];
                    const hasErrors = errors.some((e) => e.severity === "error");
                    const hasWarnings = errors.some((e) => e.severity === "warning");

                    return (
                      <tr
                        key={index}
                        className={
                          hasErrors
                            ? "bg-red-50 dark:bg-red-950/10"
                            : hasWarnings
                            ? "bg-yellow-50 dark:bg-yellow-950/10"
                            : "bg-green-50 dark:bg-green-950/10"
                        }
                      >
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">{row.Nombre}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.SKU || "Sin SKU"}
                        </td>
                        <td className="px-3 py-2">
                          {hasErrors ? (
                            <span className="text-xs text-red-600 flex items-center gap-1">
                              <X className="w-3 h-3" />
                              Error: {errors.find((e) => e.severity === "error")?.message}
                            </span>
                          ) : hasWarnings ? (
                            <span className="text-xs text-yellow-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {errors.find((e) => e.severity === "warning")?.message}
                            </span>
                          ) : (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Válido
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {validationResults.errorCount > 0 && (
              <div className="flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-md">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {validationResults.errorCount} filas con errores no se importarán.
                  </p>
                  <p className="text-xs">
                    Solo se importarán las {validationResults.validCount + validationResults.warningCount} filas válidas.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Importing Step */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Importando productos...</p>
            <p className="text-sm text-muted-foreground">
              Por favor espera mientras procesamos el archivo
            </p>
          </div>
        )}

        {/* Results Step */}
        {step === "results" && importResult && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResult.summary.created}
                </div>
                <div className="text-xs text-muted-foreground">Creados</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {importResult.summary.updated}
                </div>
                <div className="text-xs text-muted-foreground">Actualizados</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {importResult.summary.skipped}
                </div>
                <div className="text-xs text-muted-foreground">Omitidos</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {importResult.summary.failed}
                </div>
                <div className="text-xs text-muted-foreground">Fallidos</div>
              </div>
            </div>

            {/* Success Message */}
            {importResult.summary.created + importResult.summary.updated > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-500 bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                <CheckCircle2 className="w-4 h-4" />
                <p>
                  Importación completada exitosamente.{" "}
                  {importResult.summary.created + importResult.summary.updated}{" "}
                  productos procesados.
                </p>
              </div>
            )}

            {/* Error List */}
            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Detalles de errores:</p>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 text-sm border-b last:border-b-0"
                    >
                      <span className="font-medium">Fila {error.row}:</span>{" "}
                      <span className="text-muted-foreground">
                        {error.product}
                      </span>{" "}
                      - {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                  setParsedData([]);
                  setValidationResults(null);
                }}
              >
                Atrás
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  !validationResults ||
                  validationResults.validCount + validationResults.warningCount ===
                    0
                }
              >
                Importar{" "}
                {validationResults &&
                  `(${validationResults.validCount + validationResults.warningCount})`}
              </Button>
            </>
          )}

          {step === "results" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                  setParsedData([]);
                  setValidationResults(null);
                  setImportResult(null);
                }}
              >
                Importar Otro
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
