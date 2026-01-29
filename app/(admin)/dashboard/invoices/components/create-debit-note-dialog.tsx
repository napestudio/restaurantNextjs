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
import { generateDebitNote } from "@/actions/Invoice";
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

interface CreateDebitNoteDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateDebitNoteDialog({
  invoice,
  open,
  onOpenChange,
  onSuccess,
}: CreateDebitNoteDialogProps) {
  const [isPending, startTransition] = useTransition();
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
        description: "Debe ingresar un motivo para la nota de débito",
        variant: "destructive",
      });
      return;
    }

    // Validate items
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

    if (totals.total <= 0) {
      toast({
        title: "Monto inválido",
        description: "El monto de la nota de débito debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const lineItems = items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
      }));

      const result = await generateDebitNote({
        originalInvoiceId: invoice.id,
        items: lineItems,
        reason,
      });

      if (result.success) {
        toast({
          title: "Nota de débito generada",
          description: "La nota de débito se generó exitosamente",
        });
        onOpenChange(false);
        setReason("");
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
          <DialogTitle>Crear Nota de Débito</DialogTitle>
          <DialogDescription>
            Generar nota de débito para Factura {invoice.invoiceType}-
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
                <span className="text-gray-600">Total Original:</span> $
                {invoice.totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Info message */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <p>
              <strong>Nota de Débito:</strong> Se utiliza para adicionar cargos a una
              factura ya emitida (ej: recargos, penalidades, ajustes por diferencias
              de precio, etc.)
            </p>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Cargos Adicionales</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar Cargo
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
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
                      placeholder="Descripción del cargo"
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

          {/* Totals */}
          <div className="rounded-lg border p-4 bg-red-50">
            <h3 className="font-medium mb-2">Totales de la Nota de Débito</h3>
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
                <span>Total Cargo Adicional:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-xs pt-2">
                <span>Nuevo Total (Original + ND):</span>
                <span>
                  ${invoice ? (invoice.totalAmount + totals.total).toFixed(2) : "0.00"}
                </span>
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
              placeholder="Ingrese el motivo de la nota de débito (ej: recargo por pago fuera de término, diferencia de precio, penalidad, etc.)"
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
            {isPending ? "Generando..." : "Generar Nota de Débito"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
