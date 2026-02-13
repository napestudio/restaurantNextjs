"use client";

import { generateInvoicePDF } from "@/actions/Invoice";
import { prepareInvoicePrint } from "@/actions/PrinterActions";
import { OrderStatus, OrderType } from "@/app/generated/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/types/orders";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Download,
  Package,
  Printer,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
// type Order = {
//   id: string;
//   publicCode: string;
//   type: OrderType;
//   status: OrderStatus;
//   customerName: string | null;
//   customerEmail: string | null;
//   partySize: number | null;
//   description: string | null;
//   courierName: string | null;
//   createdAt: Date;
//   tableId: string | null;
//   paymentMethod: string;
//   discountPercentage: number;
//   needsInvoice: boolean;
//   assignedToId: string | null;
//   table: {
//     number: number;
//     name: string | null;
//   } | null;
//   client: ClientData | null;
//   assignedTo: {
//     id: string;
//     name: string | null;
//     username: string;
//   } | null;
//   items: Array<{
//     id: string;
//     itemName: string;
//     quantity: number;
//     price: number;
//     originalPrice: number | null;
//     product: {
//       name: string;
//       categoryId: string | null;
//     } | null;
//   }>;
//   invoices?: Array<{
//     id: string;
//     status: "PENDING" | "EMITTED" | "CANCELLED" | "FAILED";
//     cae: string | null;
//     invoiceNumber: number;
//     invoiceDate: Date;
//   }>;
// };

interface OrderListViewProps {
  orders: Order[];
  onOrderClick?: (order: Order) => void;
}

const statusColors = {
  [OrderStatus.PENDING]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [OrderStatus.IN_PROGRESS]: "bg-blue-100 text-blue-800 border-blue-200",
  [OrderStatus.COMPLETED]: "bg-green-100 text-green-800 border-green-200",
  [OrderStatus.CANCELED]: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  [OrderStatus.PENDING]: "Pendiente",
  [OrderStatus.IN_PROGRESS]: "En Progreso",
  [OrderStatus.COMPLETED]: "Completada",
  [OrderStatus.CANCELED]: "Cancelada",
};

const typeIcons = {
  [OrderType.DINE_IN]: UtensilsCrossed,
  [OrderType.TAKE_AWAY]: Package,
  [OrderType.DELIVERY]: Truck,
};

const typeLabels = {
  [OrderType.DINE_IN]: "Para Comer Aquí",
  [OrderType.TAKE_AWAY]: "Para Llevar",
  [OrderType.DELIVERY]: "Delivery",
};

export function OrderListView({ orders, onOrderClick }: OrderListViewProps) {
  const { toast } = useToast();
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(
    null,
  );
  const [printingInvoice, setPrintingInvoice] = useState<string | null>(null);

  const handleDownloadInvoice = async (
    e: React.MouseEvent,
    invoiceId: string,
    orderId: string,
  ) => {
    e.stopPropagation(); // Prevent row click
    setDownloadingInvoice(orderId);

    try {
      const result = await generateInvoicePDF(invoiceId);

      if (result.success && result.data) {
        // Convert buffer to blob and download
        const pdfBuffer = result.data.pdf;
        // Convert Node.js Buffer to ArrayBuffer for browser
        const arrayBuffer = pdfBuffer.buffer.slice(
          pdfBuffer.byteOffset,
          pdfBuffer.byteOffset + pdfBuffer.byteLength,
        ) as ArrayBuffer;
        const blob = new Blob([arrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Factura descargada",
          description: "El PDF se descargó correctamente",
        });
      } else {
        toast({
          title: "Error",
          description: !result.success
            ? result.error || "No se pudo descargar la factura"
            : "No se pudo descargar la factura",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al descargar la factura",
        variant: "destructive",
      });
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const handlePrintInvoice = async (
    e: React.MouseEvent,
    invoiceId: string,
    orderId: string,
  ) => {
    e.stopPropagation(); // Prevent row click
    setPrintingInvoice(orderId);

    try {
      const result = await prepareInvoicePrint(invoiceId);

      if (result.success) {
        toast({
          title: "Factura enviada a impresión",
          description: "La factura se envió a la impresora térmica",
        });
      } else {
        toast({
          title: "Error",
          description: !result.success
            ? result.error || "No se pudo imprimir la factura"
            : "No se pudo imprimir la factura",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al imprimir la factura",
        variant: "destructive",
      });
    } finally {
      setPrintingInvoice(null);
    }
  };

  const getInvoiceStatus = (order: Order) => {
    if (!order.invoices || order.invoices.length === 0) {
      return { hasInvoice: false, label: "No facturado", emittedInvoice: null };
    }

    const emittedInvoice = order.invoices.find(
      (inv) => inv.status === "EMITTED",
    );

    if (emittedInvoice) {
      return { hasInvoice: true, label: "Facturado", emittedInvoice };
    }

    return { hasInvoice: false, label: "No facturado", emittedInvoice: null };
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay órdenes
        </h3>
        <p className="text-gray-500">
          No se encontraron órdenes con los filtros seleccionados.
        </p>
      </div>
    );
  }

  const calculateTotal = (order: Order) => {
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
    const discount = subtotal * (order.discountPercentage / 100);
    return subtotal - discount;
  };

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mesa/Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Productos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha/Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Facturación
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => {
              const TypeIcon = typeIcons[order.type];
              const total = calculateTotal(order);

              return (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onOrderClick?.(order)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {order.publicCode}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {typeLabels[order.type]}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {order.table ? (
                        <>
                          <div className="text-gray-900 font-medium">
                            Mesa {order.table.number}
                          </div>
                          {order.partySize && (
                            <div className="text-xs text-gray-500">
                              {order.partySize}{" "}
                              {order.partySize === 1 ? "persona" : "personas"}
                            </div>
                          )}
                        </>
                      ) : order.client ? (
                        <div className="text-gray-900">{order.client.name}</div>
                      ) : (
                        <div className="text-gray-400">-</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900 font-medium">
                        {order.items.length}{" "}
                        {order.items.length === 1 ? "producto" : "productos"}
                      </div>
                      <div className="text-xs text-gray-500 max-w-xs truncate">
                        {order.items
                          .map((item) => `${item.quantity}x ${item.itemName}`)
                          .join(", ")}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {format(new Date(order.createdAt), "dd/MM/yyyy", {
                        locale: es,
                      })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(order.createdAt), "HH:mm", {
                        locale: es,
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      className={statusColors[order.status]}
                      variant="outline"
                    >
                      {statusLabels[order.status]}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const status = getInvoiceStatus(order);
                      return (
                        <Badge
                          variant="outline"
                          className={
                            status.hasInvoice
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }
                        >
                          {status.label}
                        </Badge>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-gray-900">
                      ${total.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {(() => {
                      const status = getInvoiceStatus(order);

                      if (!status.emittedInvoice) {
                        return (
                          <span className="text-xs text-gray-400">
                            Sin factura
                          </span>
                        );
                      }

                      return (
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) =>
                              handleDownloadInvoice(
                                e,
                                status.emittedInvoice!.id,
                                order.id,
                              )
                            }
                            disabled={downloadingInvoice === order.id}
                            title="Descargar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) =>
                              handlePrintInvoice(
                                e,
                                status.emittedInvoice!.id,
                                order.id,
                              )
                            }
                            disabled={printingInvoice === order.id}
                            title="Re-imprimir"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
