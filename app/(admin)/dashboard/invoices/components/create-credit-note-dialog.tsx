"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateCreditNote } from "@/actions/Invoice";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  invoiceType: number;
  invoiceNumber: number;
  ptoVta: number;
  customerName: string;
  customerDocType: number;
  customerDocNumber: string;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  invoiceDate: Date;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface CreateCreditNoteDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateCreditNoteDialog({
  invoice,
  open,
  onOpenChange,
  onSuccess,
}: CreateCreditNoteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [creditNoteType, setCreditNoteType] = useState<"full" | "partial">("full");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, vatRate: 21 },
  ]);
  const { toast } = useToast();

  const handleAddItem = () => {
    const newId = String(Date.now());
    setItems([
      ...items,
      { id: newId, description: "", quantity: 1, unitPrice: 0, vatRate: 21 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (
    id: string,
    field: keyof LineItem,
    value: string | number,
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const calculateTotals = () => {
    if (creditNoteType === "full" && invoice) {
      return {
        subtotal: invoice.subtotal,
        vatAmount: invoice.vatAmount,
        total: invoice.totalAmount,
      };
    }

    let subtotal = 0;
    let vatAmount = 0;

    for (const item of items) {
      const lineTotal = item.quantity * item.unitPrice;
      const netAmount = lineTotal / (1 + item.vatRate / 100);
      const itemVat = lineTotal - netAmount;

      subtotal += netAmount;
      vatAmount += itemVat;
    }

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total: Math.round((subtotal + vatAmount) * 100) / 100,
    };
  };

  const totals = calculateTotals();

  const handleSubmit = () => {
    if (!invoice) return;

    if (!reason.trim()) {
      toast({
        title: "Motivo requerido",
        description: "Debe ingresar un motivo para la nota de crédito",
        variant: "destructive",
      });
      return;
    }

    // Validate partial items
    if (creditNoteType === "partial") {
      for (const item of items) {
        if (!item.description.trim()) {
          toast({
            title: "Descripción requerida",
            description: "Todos los ítems deben tener descripción",
            variant: "destructive",
          });
          return;
        }
        if (item.quantity <= 0) {
          toast({
            title: "Cantidad inválida",
            description: "La cantidad debe ser mayor a 0",
            variant: "destructive",
          });
          return;
        }
        if (item.unitPrice <= 0) {
          toast({
            title: "Precio inválido",
            description: "El precio unitario debe ser mayor a 0",
            variant: "destructive",
          });
          return;
        }
      }

      // Validate total doesn't exceed original invoice
      if (totals.total > invoice.totalAmount) {
        toast({
          title: "Monto excedido",
          description: "El monto de la NC no puede superar el de la factura original",
          variant: "destructive",
        });
        return;
      }
    }

    startTransition(async () => {
      const lineItems =
        creditNoteType === "full"
          ? [
              {
                description: "Anulación total de factura",
                quantity: 1,
                unitPrice: invoice.totalAmount,
                vatRate: 21, // Default VAT rate
              },
            ]
          : items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              vatRate: item.vatRate,
            }));

      const result = await generateCreditNote({
        originalInvoiceId: invoice.id,
        items: lineItems,
        reason,
      });

      if (result.success) {
        toast({
          title: "Nota de crédito generada",
          description: "La nota de crédito se generó exitosamente",
        });
        onOpenChange(false);
        setReason("");
        setCreditNoteType("full");
        setItems([
          { id: "1", description: "", quantity: 1, unitPrice: 0, vatRate: 21 },
        ]);
        onSuccess?.();
      } else {
        toast({
          title: "Error al generar",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nota de Crédito</DialogTitle>
          <DialogDescription>
            Generar nota de crédito para Factura {invoice.invoiceType}-
            {invoice.ptoVta}-{invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice details */}
          <div className="rounded-lg border p-4 bg-gray-50">
            <h3 className="font-medium mb-2">Factura Original</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Cliente:</span>{" "}
                {invoice.customerName}
              </div>
              <div>
                <span className="text-gray-600">Documento:</span>{" "}
                {invoice.customerDocNumber}
              </div>
              <div>
                <span className="text-gray-600">Fecha:</span>{" "}
                {new Date(invoice.invoiceDate).toLocaleDateString()}
              </div>
              <div>
                <span className="text-gray-600">Total:</span> $
                {invoice.totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Credit note type */}
          <div className="space-y-3">
            <Label>Tipo de Nota de Crédito</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="full"
                  name="creditNoteType"
                  value="full"
                  checked={creditNoteType === "full"}
                  onChange={(e) => setCreditNoteType(e.target.value as "full" | "partial")}
                  className="h-4 w-4"
                />
                <Label htmlFor="full" className="font-normal cursor-pointer">
                  Anulación total (100% del monto)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="partial"
                  name="creditNoteType"
                  value="partial"
                  checked={creditNoteType === "partial"}
                  onChange={(e) => setCreditNoteType(e.target.value as "full" | "partial")}
                  className="h-4 w-4"
                />
                <Label htmlFor="partial" className="font-normal cursor-pointer">
                  Devolución parcial (especificar ítems)
                </Label>
              </div>
            </div>
          </div>

          {/* Partial items */}
          {creditNoteType === "partial" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Ítems a Devolver</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Ítem
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg"
                  >
                    <div className="col-span-4">
                      <Label className="text-xs">Descripción</Label>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(item.id, "description", e.target.value)
                        }
                        placeholder="Descripción del ítem"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "quantity",
                            parseInt(e.target.value) || 1,
                          )
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Precio Unit.</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "unitPrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">IVA %</Label>
                      <select
                        value={item.vatRate}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "vatRate",
                            parseFloat(e.target.value),
                          )
                        }
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value={0}>0%</option>
                        <option value={10.5}>10.5%</option>
                        <option value={21}>21%</option>
                        <option value={27}>27%</option>
                      </select>
                    </div>
                    <div className="col-span-2 flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length === 1}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="rounded-lg border p-4 bg-blue-50">
            <h3 className="font-medium mb-2">Totales de la Nota de Crédito</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IVA:</span>
                <span>${totals.vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-1 border-t">
                <span>Total:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ingrese el motivo de la nota de crédito (ej: devolución de mercadería, error en facturación, etc.)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Generando..." : "Generar Nota de Crédito"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
