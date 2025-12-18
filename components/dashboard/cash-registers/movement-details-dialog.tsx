"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Building2,
  ArrowRightLeft,
  Wallet,
  Calendar,
  Clock,
  FileText,
  User,
} from "lucide-react";
import { PAYMENT_METHOD_LABELS, MOVEMENT_TYPE_LABELS } from "@/types/cash-register";

interface Movement {
  id: string;
  type: "INCOME" | "EXPENSE";
  paymentMethod: string;
  amount: number;
  description: string | null;
  createdAt: string;
  createdBy: string;
  sessionId: string;
  cashRegister: {
    id: string;
    name: string;
  };
}

interface MovementDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: Movement | null;
}

const PAYMENT_METHOD_ICONS: Record<string, React.ReactNode> = {
  CASH: <Banknote className="h-4 w-4" />,
  CARD_DEBIT: <CreditCard className="h-4 w-4" />,
  CARD_CREDIT: <CreditCard className="h-4 w-4" />,
  TRANSFER: <ArrowRightLeft className="h-4 w-4" />,
  ACCOUNT: <Building2 className="h-4 w-4" />,
};

export function MovementDetailsDialog({
  open,
  onOpenChange,
  movement,
}: MovementDetailsDialogProps) {
  if (!movement) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isIncome = movement.type === "INCOME";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isIncome ? (
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            ) : (
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            )}
            <span>Detalle del Movimiento</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount Section */}
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              {MOVEMENT_TYPE_LABELS[movement.type]}
            </p>
            <p
              className={`text-3xl font-bold ${
                isIncome ? "text-green-600" : "text-red-600"
              }`}
            >
              {isIncome ? "+" : "-"}
              {formatCurrency(movement.amount)}
            </p>
          </div>

          {/* Details Grid */}
          <div className="space-y-4">
            {/* Payment Method */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                {PAYMENT_METHOD_ICONS[movement.paymentMethod] || (
                  <Wallet className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Medio de Pago</p>
                <p className="font-medium">
                  {PAYMENT_METHOD_LABELS[
                    movement.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS
                  ] || movement.paymentMethod}
                </p>
              </div>
            </div>

            {/* Cash Register */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Caja</p>
                <p className="font-medium">{movement.cashRegister.name}</p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="font-medium capitalize">
                  {formatDate(movement.createdAt)}
                </p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hora</p>
                <p className="font-medium">{formatTime(movement.createdAt)}</p>
              </div>
            </div>

            {/* Created By */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Registrado por</p>
                <p className="font-medium">{movement.createdBy || "Sistema"}</p>
              </div>
            </div>

            {/* Description */}
            {movement.description && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Descripción</p>
                  <p className="font-medium text-sm">{movement.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Type Badge */}
          <div className="flex justify-center pt-2">
            <Badge
              variant={isIncome ? "default" : "destructive"}
              className={`${
                isIncome
                  ? "bg-green-100 text-green-700 hover:bg-green-100"
                  : "bg-red-100 text-red-700 hover:bg-red-100"
              }`}
            >
              {isIncome ? "Ingreso Manual" : "Egreso Manual"}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
