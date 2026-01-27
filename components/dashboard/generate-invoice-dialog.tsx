"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Loader2 } from "lucide-react";
import { generateInvoiceForOrder } from "@/actions/Invoice";
import { useToast } from "@/hooks/use-toast";

interface GenerateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderTotal: number;
  onSuccess?: () => void;
}

// Invoice types according to AFIP
const INVOICE_TYPES = [
  {
    value: "1",
    label: "Factura A",
    description: "Para responsables inscriptos",
  },
  {
    value: "6",
    label: "Factura B",
    description: "Para consumidor final / monotributistas",
  },
  { value: "11", label: "Factura C", description: "Para operaciones exentas" },
] as const;

// Document types according to AFIP
const DOCUMENT_TYPES = [
  { value: "80", label: "CUIT" },
  { value: "86", label: "CUIL" },
  { value: "96", label: "DNI" },
  { value: "99", label: "Consumidor Final" },
] as const;

export function GenerateInvoiceDialog({
  open,
  onOpenChange,
  orderId,
  orderTotal,
  onSuccess,
}: GenerateInvoiceDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [invoiceType, setInvoiceType] = useState<string>("6"); // Default to Factura B
  const [customerName, setCustomerName] = useState("");
  const [docType, setDocType] = useState<string>("99"); // Default to Consumidor Final
  const [docNumber, setDocNumber] = useState("");
  const { toast } = useToast();

  const isConsumidorFinal = docType === "99";

  const resetForm = () => {
    setInvoiceType("6");
    setCustomerName("");
    setDocType("99");
    setDocNumber("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!customerName.trim()) {
      toast({
        title: "Error",
        description: "Debe ingresar el nombre del cliente",
        variant: "destructive",
      });
      return;
    }

    if (!isConsumidorFinal && !docNumber.trim()) {
      toast({
        title: "Error",
        description: "Debe ingresar el número de documento",
        variant: "destructive",
      });
      return;
    }

    // Validate invoice type compatibility with document type
    const invoiceTypeNum = parseInt(invoiceType);
    const docTypeNum = parseInt(docType);

    // Factura A (type 1) requires CUIT (80)
    if (invoiceTypeNum === 1 && docTypeNum !== 80) {
      toast({
        title: "Error",
        description: "Factura A requiere CUIT del cliente",
        variant: "destructive",
      });
      return;
    }

    // Factura B (type 6) cannot be issued to CUIT holders (they need Factura A)
    if (invoiceTypeNum === 6 && docTypeNum === 80) {
      toast({
        title: "Error",
        description: "Para CUIT debe emitir Factura A",
        variant: "destructive",
      });
      return;
    }

    setIsPending(true);

    try {
      const result = await generateInvoiceForOrder(orderId, invoiceTypeNum, {
        name: customerName.trim(),
        docType: docTypeNum,
        docNumber: isConsumidorFinal ? "0" : docNumber.trim(),
      });

      if (result.success) {
        toast({
          title: "Factura generada exitosamente",
          description: `CAE: ${(result.data as Record<string, unknown>).cae}`,
        });
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: "Error al generar factura",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error inesperado",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo generar la factura",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isPending) {
      if (!newOpen) {
        resetForm();
      }
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generar Factura Electrónica
          </DialogTitle>
          <DialogDescription>
            Complete los datos para generar la factura AFIP para esta orden.
            <br />
            <span className="font-semibold">
              Total: ${orderTotal.toFixed(2)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Invoice Type */}
            <div className="grid gap-2">
              <Label htmlFor="invoiceType">Tipo de Factura</Label>
              <Select
                value={invoiceType}
                onValueChange={setInvoiceType}
                disabled={isPending}
              >
                <SelectTrigger id="invoiceType">
                  <SelectValue placeholder="Seleccione tipo de factura" />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {type.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Name */}
            <div className="grid gap-2">
              <Label htmlFor="customerName">
                Nombre del Cliente <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerName"
                placeholder="Razón social o nombre completo"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            {/* Document Type */}
            <div className="grid gap-2">
              <Label htmlFor="docType">Tipo de Documento</Label>
              <Select
                value={docType}
                onValueChange={setDocType}
                disabled={isPending}
              >
                <SelectTrigger id="docType">
                  <SelectValue placeholder="Seleccione tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document Number */}
            <div className="grid gap-2">
              <Label htmlFor="docNumber">
                Número de Documento{" "}
                {!isConsumidorFinal && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="docNumber"
                placeholder={
                  isConsumidorFinal
                    ? "No aplica"
                    : "Número sin guiones ni puntos"
                }
                value={isConsumidorFinal ? "" : docNumber}
                onChange={(e) =>
                  setDocNumber(e.target.value.replace(/\D/g, ""))
                }
                disabled={isPending || isConsumidorFinal}
                required={!isConsumidorFinal}
                maxLength={11}
              />
              {!isConsumidorFinal && (
                <p className="text-xs text-muted-foreground">
                  {docType === "80" && "CUIT: 11 dígitos (ej: 20123456789)"}
                  {docType === "86" && "CUIL: 11 dígitos (ej: 20123456789)"}
                  {docType === "96" && "DNI: 7-8 dígitos"}
                </p>
              )}
            </div>

            {/* Help text */}
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <p className="font-semibold mb-1">Guía rápida:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Factura A:</strong> Empresas con CUIT (Responsables
                  Inscriptos)
                </li>
                <li>
                  <strong>Factura B:</strong> Consumidor Final o Monotributistas
                </li>
                <li>
                  <strong>Factura C:</strong> Operaciones exentas de IVA
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generar Factura
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
