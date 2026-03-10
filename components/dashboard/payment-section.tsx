"use client";

import { type PaymentMethodExtended } from "@/actions/Order";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { type PaymentLine } from "@/hooks/use-payments";
import { formatCurrency } from "@/lib/currency";
import { PAYMENT_METHODS } from "@/types/cash-register";
import { CheckCircle2, CreditCard, Plus, X } from "lucide-react";

interface PaymentSectionProps {
  payments: PaymentLine[];
  remainder: number;
  change: number;
  lastAddedId?: string | null;
  disabled?: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (
    id: string,
    field: "method" | "amount",
    value: string,
  ) => void;
}

export function PaymentSection({
  payments,
  remainder,
  change,
  lastAddedId,
  disabled = false,
  onAdd,
  onRemove,
  onUpdate,
}: PaymentSectionProps) {
  const isLastLine = (id: string) => payments[payments.length - 1]?.id === id;
  const isSplit = payments.length > 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-lg">Pago</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Dividir pago
        </Button>
      </div>

      {/* Payment Lines */}
      <div className="space-y-3">
        {payments.map((payment) => (
          <div key={payment.id} className="flex items-center gap-3">
            <select
              value={payment.method}
              onChange={(e) =>
                onUpdate(
                  payment.id,
                  "method",
                  e.target.value as PaymentMethodExtended,
                )
              }
              disabled={disabled}
              className="w-48 h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>

            <div className="relative flex-1 min-w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <CurrencyInput
                value={payment.amount}
                onChange={(e) =>
                  onUpdate(payment.id, "amount", e.target.value)
                }
                placeholder="0,00"
                className={`pl-7 ${isSplit && isLastLine(payment.id) ? "text-muted-foreground" : ""}`}
                disabled={disabled}
                autoFocus={payment.id === lastAddedId}
              />
            </div>

            {payments.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-red-500 shrink-0"
                onClick={() => onRemove(payment.id)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Status Indicator */}
      {isSplit && (
        <div>
          {remainder > 0.01 ? (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-orange-800 font-medium text-sm">
                  Restante:
                </span>
                <span className="text-lg font-bold text-orange-700">
                  {formatCurrency(remainder)}
                </span>
              </div>
            </div>
          ) : change > 0.01 ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-blue-800 font-medium text-sm">
                  Vuelto:
                </span>
                <span className="text-lg font-bold text-blue-700">
                  {formatCurrency(change)}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Cubierto</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Change Display (single payment line) */}
      {!isSplit && change > 0.01 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-green-800 font-medium">Vuelto:</span>
            <span className="text-2xl font-bold text-green-700">
              {formatCurrency(change)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
