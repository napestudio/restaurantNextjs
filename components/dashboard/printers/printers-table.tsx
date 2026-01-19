"use client";

import { Badge } from "@/components/ui/badge";
import { Printer as PrinterIcon, Power, PowerOff } from "lucide-react";
import type { Printer } from "@/app/generated/prisma";

type PrinterWithStation = Printer & {
  station: { id: string; name: string; color: string } | null;
  _count: { printJobs: number };
};

interface PrintersTableProps {
  printers: PrinterWithStation[];
  onPrinterClick: (printer: PrinterWithStation) => void;
}

export function PrintersTable({ printers, onPrinterClick }: PrintersTableProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
              Nombre
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
              Conexión
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
              Estación
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
              Auto-impresión
            </th>
            <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">
              Activa
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {printers.map((printer) => (
            <tr
              key={printer.id}
              onClick={() => onPrinterClick(printer)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <PrinterIcon className="h-4 w-4 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-medium">{printer.name}</p>
                    {printer.model && (
                      <p className="text-xs text-muted-foreground">
                        {printer.model}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="font-mono text-sm">
                  {printer.systemName || "No configurado"}
                </span>
              </td>
              <td className="py-3 px-4">
                {printer.station ? (
                  <Badge
                    style={{ backgroundColor: printer.station.color }}
                    className="text-white"
                  >
                    {printer.station.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                <span className="text-sm">
                  {printer.autoPrint ? "Sí" : "No"}
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                {printer.isActive ? (
                  <Power className="h-4 w-4 text-green-600 mx-auto" />
                ) : (
                  <PowerOff className="h-4 w-4 text-gray-400 mx-auto" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
