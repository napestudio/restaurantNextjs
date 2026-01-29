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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Loader2, Plus, X } from "lucide-react";
import { generateInvoiceForOrder, generateManualInvoice } from "@/actions/Invoice";
import type { ManualInvoiceLineItem } from "@/actions/Invoice";
import type { OrderWithoutInvoice } from "@/actions/Order";
import { OrderCombobox } from "@/components/ui/order-combobox";
import { useToast } from "@/hooks/use-toast";

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onSuccess?: () => void;
}

// Invoice types
const INVOICE_TYPES = [
  { value: "1", label: "Factura A", description: "Para responsables inscriptos" },
  { value: "6", label: "Factura B", description: "Para consumidor final / monotributistas" },
  { value: "11", label: "Factura C", description: "Para operaciones exentas" },
] as const;

// Document types
const DOCUMENT_TYPES = [
  { value: "80", label: "CUIT" },
  { value: "86", label: "CUIL" },
  { value: "96", label: "DNI" },
  { value: "99", label: "Consumidor Final" },
] as const;

// VAT rates
const VAT_RATES = [
  { value: "0", label: "0%" },
  { value: "10.5", label: "10.5%" },
  { value: "21", label: "21%" },
  { value: "27", label: "27%" },
] as const;

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  branchId,
  onSuccess,
}: CreateInvoiceDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [activeTab, setActiveTab] = useState<"order" | "manual">("order");
  const { toast } = useToast();

  // Common fields
  const [invoiceType, setInvoiceType] = useState<string>("6");
  const [customerName, setCustomerName] = useState("");
  const [docType, setDocType] = useState<string>("99");
  const [docNumber, setDocNumber] = useState("");

  // Order tab
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithoutInvoice | null>(null);

  // Manual tab
  const [lineItems, setLineItems] = useState<Array<ManualInvoiceLineItem & { id: string }>>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, vatRate: 21 },
  ]);

  const isConsumidorFinal = docType === "99";

  const resetForm = () => {
    setInvoiceType("6");
    setCustomerName("");
    setDocType("99");
    setDocNumber("");
    setSelectedOrderId("");
    setSelectedOrder(null);
    setLineItems([{ id: "1", description: "", quantity: 1, unitPrice: 0, vatRate: 21 }]);
    setActiveTab("order");
  };

  // Calculate totals for manual invoice
  const calculateTotals = () => {
    let subtotal = 0;
    const vatGroups: Record<number, { base: number; amount: number }> = {};

    lineItems.forEach((item) => {
      if (item.quantity > 0 && item.unitPrice > 0) {
        const lineTotal = item.quantity * item.unitPrice;
        const netAmount = lineTotal / (1 + item.vatRate / 100);
        const vatAmount = lineTotal - netAmount;

        if (!vatGroups[item.vatRate]) {
          vatGroups[item.vatRate] = { base: 0, amount: 0 };
        }
        vatGroups[item.vatRate].base += netAmount;
        vatGroups[item.vatRate].amount += vatAmount;
      }
    });

    subtotal = Object.values(vatGroups).reduce((sum, v) => sum + v.base, 0);
    const totalVat = Object.values(vatGroups).reduce((sum, v) => sum + v.amount, 0);
    const total = subtotal + totalVat;

    return { subtotal, totalVat, total, vatGroups };
  };

  const totals = calculateTotals();

  const addLineItem = () => {
    const newId = (Math.max(...lineItems.map(item => parseInt(item.id))) + 1).toString();
    setLineItems([...lineItems, { id: newId, description: "", quantity: 1, unitPrice: 0, vatRate: 21 }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof ManualInvoiceLineItem, value: string | number) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const validateForm = (): boolean => {
    // Customer name required
    if (!customerName.trim()) {
      toast({
        title: "Error",
        description: "Debe ingresar el nombre del cliente",
        variant: "destructive",
      });
      return false;
    }

    // Document number required if not consumidor final
    if (!isConsumidorFinal && !docNumber.trim()) {
      toast({
        title: "Error",
        description: "Debe ingresar el número de documento",
        variant: "destructive",
      });
      return false;
    }

    const invoiceTypeNum = parseInt(invoiceType);
    const docTypeNum = parseInt(docType);

    // Factura A requires CUIT
    if (invoiceTypeNum === 1 && docTypeNum !== 80) {
      toast({
        title: "Error",
        description: "Factura A requiere CUIT del cliente",
        variant: "destructive",
      });
      return false;
    }

    // Factura B cannot be issued to CUIT holders
    if (invoiceTypeNum === 6 && docTypeNum === 80) {
      toast({
        title: "Error",
        description: "Para CUIT debe emitir Factura A",
        variant: "destructive",
      });
      return false;
    }

    // Tab-specific validation
    if (activeTab === "order") {
      if (!selectedOrderId || !selectedOrder) {
        toast({
          title: "Error",
          description: "Debe seleccionar un pedido",
          variant: "destructive",
        });
        return false;
      }
    } else {
      // Manual invoice validation
      const validItems = lineItems.filter(
        item => item.description.trim() && item.quantity > 0 && item.unitPrice > 0
      );

      if (validItems.length === 0) {
        toast({
          title: "Error",
          description: "Debe agregar al menos un ítem válido",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsPending(true);

    try {
      const invoiceTypeNum = parseInt(invoiceType);
      const docTypeNum = parseInt(docType);
      const customerData = {
        name: customerName.trim(),
        docType: docTypeNum,
        docNumber: isConsumidorFinal ? "0" : docNumber.trim(),
      };

      let result;

      if (activeTab === "order" && selectedOrderId) {
        // Generate invoice from order
        result = await generateInvoiceForOrder(selectedOrderId, invoiceTypeNum, customerData);
      } else {
        // Generate manual invoice
        const validItems = lineItems
          .filter(item => item.description.trim() && item.quantity > 0 && item.unitPrice > 0)
          .map(({ id, ...item }) => item);

        result = await generateManualInvoice({
          branchId,
          invoiceType: invoiceTypeNum,
          customerData,
          items: validItems,
        });
      }

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
        description: error instanceof Error ? error.message : "No se pudo generar la factura",
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

  const handleOrderSelect = (orderId: string, order: OrderWithoutInvoice | null) => {
    setSelectedOrderId(orderId);
    setSelectedOrder(order);
    if (order?.customerName) {
      setCustomerName(order.customerName);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Crear Factura Electrónica
          </DialogTitle>
          <DialogDescription>
            Genere una factura desde un pedido o cree una factura manual.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "order" | "manual")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="order">Desde Pedido</TabsTrigger>
              <TabsTrigger value="manual">Factura Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="order" className="space-y-4 mt-4">
              <OrderCombobox
                branchId={branchId}
                value={selectedOrderId}
                onSelect={handleOrderSelect}
              />

              {selectedOrder && (
                <div className="text-sm text-muted-foreground">
                  Total del pedido: <span className="font-semibold">${selectedOrder.total.toFixed(2)}</span>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Ítems de la Factura</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLineItem}
                    disabled={isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar ítem
                  </Button>
                </div>

                {lineItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-md">
                    <div className="col-span-5">
                      <Input
                        placeholder="Descripción"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                        disabled={isPending}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Cant."
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                        disabled={isPending}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Precio"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                        disabled={isPending}
                      />
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={item.vatRate.toString()}
                        onValueChange={(v) => updateLineItem(item.id, "vatRate", parseFloat(v))}
                        disabled={isPending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VAT_RATES.map((rate) => (
                            <SelectItem key={rate.value} value={rate.value}>
                              {rate.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        disabled={isPending || lineItems.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="bg-muted p-4 rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                {Object.entries(totals.vatGroups).map(([rate, values]) => (
                  <div key={rate} className="flex justify-between text-sm text-muted-foreground">
                    <span>IVA {rate}%:</span>
                    <span>${values.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total:</span>
                  <span>${totals.total.toFixed(2)}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Common customer fields */}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="invoiceType">Tipo de Factura</Label>
              <Select value={invoiceType} onValueChange={setInvoiceType} disabled={isPending}>
                <SelectTrigger id="invoiceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            <div className="grid gap-2">
              <Label htmlFor="docType">Tipo de Documento</Label>
              <Select value={docType} onValueChange={setDocType} disabled={isPending}>
                <SelectTrigger id="docType">
                  <SelectValue />
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

            <div className="grid gap-2">
              <Label htmlFor="docNumber">
                Número de Documento {!isConsumidorFinal && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="docNumber"
                placeholder={isConsumidorFinal ? "No aplica" : "Número sin guiones ni puntos"}
                value={isConsumidorFinal ? "" : docNumber}
                onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, ""))}
                disabled={isPending || isConsumidorFinal}
                required={!isConsumidorFinal}
                maxLength={11}
              />
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
