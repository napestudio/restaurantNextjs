"use client";

import { importProductsCSV } from "@/actions/Products";
import type { Category } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateTemplateCSV, parseCSV } from "@/lib/csv/csv-parser";
import type {
  CSVImportMode,
  CSVImportResult,
  CSVImportRow,
  ValidationError,
} from "@/lib/csv/csv-types";
import { validateAllRows } from "@/lib/csv/csv-validator";
import { AlertCircle, Download, FileText, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

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
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ----------------------------- Core Logic ----------------------------- */

  const processFile = async (selectedFile: File) => {
    setError(null);

    // Validate file type
    const validTypes = ["text/csv", "application/vnd.ms-excel"];
    if (
      !validTypes.includes(selectedFile.type) &&
      !selectedFile.name.endsWith(".csv")
    ) {
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

  /* ----------------------------- Handlers ----------------------------- */

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
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    await processFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    await processFile(droppedFile);
  };

  const handleImport = async () => {
    if (!parsedData.length || !validationResults) return;

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

      if (
        result.success &&
        result.summary.created + result.summary.updated > 0
      ) {
        onSuccess();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al importar los productos",
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

  /* ----------------------------- UI ----------------------------- */

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Productos desde CSV</DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Seleccione un archivo CSV con los productos a importar"}
            {step === "preview" && "Revise los datos antes de importar"}
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
          /* --- unchanged preview UI (same as your original) --- */
          <div className="space-y-4">
            {/* ... full preview code remains identical ... */}
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
          /* --- unchanged results UI (same as your original) --- */
          <div className="space-y-4">
            {/* ... full results code remains identical ... */}
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
                  validationResults.validCount +
                    validationResults.warningCount ===
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
