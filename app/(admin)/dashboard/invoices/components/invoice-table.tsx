"use client";

import { InvoiceStatus } from "@/app/generated/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Plus,
  Printer,
  XCircle,
} from "lucide-react";
import Link from "next/link";

type Invoice = {
  id: string;
  customerName: string;
  customerDocType: number;
  customerDocNumber: string;
  invoiceType: number;
  ptoVta: number;
  invoiceNumber: number;
  invoiceDate: Date;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  cae: string | null;
  caeFchVto: string | null;
  status: InvoiceStatus;
  qrUrl: string | null;
  createdAt: Date;
  order: {
    id: string;
    publicCode: string;
  } | null;
};

interface InvoiceTableProps {
  invoices: Invoice[];
  onDownloadPDF: (invoiceId: string) => void;
  onPrint: (invoiceId: string) => void;
  onCancel: (invoiceId: string) => void;
  onCreditNote: (invoice: Invoice) => void;
  onDebitNote: (invoice: Invoice) => void;
  isProcessing: {
    downloading: string | null;
    printing: string | null;
    canceling: string | null;
  };
}

const DOC_TYPE_LABELS: Record<number, string> = {
  80: "CUIT",
  86: "CUIL",
  96: "DNI",
  99: "CF",
};

const STATUS_CONFIG = {
  [InvoiceStatus.PENDING]: {
    label: "Pendiente",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  [InvoiceStatus.EMITTED]: {
    label: "Emitida",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 border-green-200",
  },
  [InvoiceStatus.CANCELLED]: {
    label: "Anulada",
    icon: XCircle,
    color: "bg-gray-100 text-gray-800 border-gray-200",
  },
  [InvoiceStatus.FAILED]: {
    label: "Fallida",
    icon: AlertCircle,
    color: "bg-red-100 text-red-800 border-red-200",
  },
};

function InvoiceTypeBadge({ type }: { type: number }) {
  const config: Record<number, { label: string; color: string }> = {
    1: { label: "A", color: "bg-blue-100 text-blue-800 border-blue-200" },
    6: { label: "B", color: "bg-green-100 text-green-800 border-green-200" },
    11: {
      label: "C",
      color: "bg-purple-100 text-purple-800 border-purple-200",
    },
    // Credit notes
    3: {
      label: "NC-A",
      color: "bg-orange-100 text-orange-800 border-orange-200",
    },
    8: {
      label: "NC-B",
      color: "bg-orange-100 text-orange-800 border-orange-200",
    },
    15: {
      label: "NC-C",
      color: "bg-orange-100 text-orange-800 border-orange-200",
    },
    // Debit notes
    2: { label: "ND-A", color: "bg-red-100 text-red-800 border-red-200" },
    7: { label: "ND-B", color: "bg-red-100 text-red-800 border-red-200" },
    12: { label: "ND-C", color: "bg-red-100 text-red-800 border-red-200" },
  };

  const { label, color } = config[type] || config[1];

  return <Badge className={cn("font-mono text-xs", color)}>{label}</Badge>;
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge className={cn("text-xs gap-1", config.color)} variant="outline">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function InvoiceTable({
  invoices,
  onDownloadPDF,
  onPrint,
  onCancel,
  onCreditNote,
  onDebitNote,
  isProcessing,
}: InvoiceTableProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Número
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documento
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subtotal
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                IVA
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <InvoiceTypeBadge type={invoice.invoiceType} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-mono">
                    {String(invoice.ptoVta).padStart(4, "0")}-
                    {String(invoice.invoiceNumber).padStart(8, "0")}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900 max-w-50 truncate">
                    {invoice.customerName}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {DOC_TYPE_LABELS[invoice.customerDocType] ||
                      invoice.customerDocType}{" "}
                    {invoice.customerDocNumber !== "0" &&
                      invoice.customerDocNumber}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {format(new Date(invoice.invoiceDate), "dd/MM/yyyy", {
                      locale: es,
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-900">
                    ${invoice.subtotal.toFixed(2)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-900">
                    ${invoice.vatAmount.toFixed(2)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    ${invoice.totalAmount.toFixed(2)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    {/* Download PDF */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadPDF(invoice.id);
                      }}
                      disabled={isProcessing.downloading === invoice.id}
                      title="Descargar PDF"
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    {/* Print */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrint(invoice.id);
                      }}
                      disabled={isProcessing.printing === invoice.id}
                      title="Imprimir"
                      className="h-8 w-8 p-0"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>

                    {/* View in AFIP (only if qrUrl exists) */}
                    {invoice.qrUrl && (
                      <Link
                        href={invoice.qrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver en AFIP"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}

                    {/* Credit Note (only for EMITTED standard invoices) */}
                    {invoice.status === InvoiceStatus.EMITTED &&
                      [1, 6, 11].includes(invoice.invoiceType) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreditNote(invoice);
                          }}
                          title="Nota de crédito"
                          className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}

                    {/* Debit Note (only for EMITTED standard invoices) */}
                    {invoice.status === InvoiceStatus.EMITTED &&
                      [1, 6, 11].includes(invoice.invoiceType) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDebitNote(invoice);
                          }}
                          title="Nota de débito"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}

                    {/* Cancel button - shows for EMITTED invoices */}
                    {/* {invoice.status === InvoiceStatus.EMITTED &&
                      [1, 6, 11].includes(invoice.invoiceType) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                "¿Está seguro que desea anular esta factura? Se generará una nota de crédito automáticamente."
                              )
                            ) {
                              onCancel(invoice.id);
                            }
                          }}
                          disabled={isProcessing.canceling === invoice.id}
                          title="Anular factura"
                          className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )} */}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
