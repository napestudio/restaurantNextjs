"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import {
  getSessionMovements,
  closeCashRegisterSession,
} from "@/actions/CashRegister";
import { PAYMENT_METHOD_LABELS } from "@/types/cash-register";
import { cn } from "@/lib/utils";

interface SerializedSession {
  id: string;
  cashRegisterId: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  openedBy: string;
  openingAmount: number;
  closedAt: string | null;
  closedBy: string | null;
  expectedCash: number | null;
  countedCash: number | null;
  variance: number | null;
  closingNotes: string | null;
  createdAt: string;
  updatedAt: string;
  cashRegister: {
    id: string;
    name: string;
  };
  _count: {
    movements: number;
  };
}

interface SerializedMovement {
  id: string;
  sessionId: string;
  type: "INCOME" | "EXPENSE" | "SALE" | "REFUND";
  paymentMethod: "CASH" | "CARD_DEBIT" | "CARD_CREDIT" | "ACCOUNT" | "TRANSFER";
  amount: number;
  description: string | null;
  orderId: string | null;
  createdAt: string;
  createdBy: string;
}

interface SessionDetailsSidebarProps {
  session: SerializedSession | null;
  open: boolean;
  onClose: () => void;
  onSessionClosed: (session: SerializedSession) => void;
}

export function SessionDetailsSidebar({
  session,
  open,
  onClose,
  onSessionClosed,
}: SessionDetailsSidebarProps) {
  const [movements, setMovements] = useState<SerializedMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    income: true,
    expense: true,
  });

  // Close form state - now tracks amounts per payment method
  const [countedAmounts, setCountedAmounts] = useState<Record<string, string>>(
    {}
  );
  const [closingNotes, setClosingNotes] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const loadMovements = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const result = await getSessionMovements(session.id);
      if (result.success && result.data) {
        // Data is already serialized by the server action
        setMovements(result.data as SerializedMovement[]);
      }
    } catch (error) {
      console.error("Error loading movements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && open) {
      loadMovements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, open]);

  // Reset form when session changes
  useEffect(() => {
    if (!open) {
      setCountedAmounts({});
      setClosingNotes("");
      setCloseError(null);
    }
  }, [open]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Calculate totals
  const incomeMovements = movements.filter(
    (m) => m.type === "INCOME" || m.type === "SALE"
  );
  const expenseMovements = movements.filter(
    (m) => m.type === "EXPENSE" || m.type === "REFUND"
  );

  const totalIncome = incomeMovements.reduce((sum, m) => sum + m.amount, 0);
  const totalExpense = expenseMovements.reduce((sum, m) => sum + m.amount, 0);

  // Group by payment method
  const incomeByMethod = incomeMovements.reduce((acc, m) => {
    if (!acc[m.paymentMethod]) {
      acc[m.paymentMethod] = { total: 0, movements: [] };
    }
    acc[m.paymentMethod].total += m.amount;
    acc[m.paymentMethod].movements.push(m);
    return acc;
  }, {} as Record<string, { total: number; movements: SerializedMovement[] }>);

  const expenseByMethod = expenseMovements.reduce((acc, m) => {
    if (!acc[m.paymentMethod]) {
      acc[m.paymentMethod] = { total: 0, movements: [] };
    }
    acc[m.paymentMethod].total += m.amount;
    acc[m.paymentMethod].movements.push(m);
    return acc;
  }, {} as Record<string, { total: number; movements: SerializedMovement[] }>);

  // Get all unique payment methods used in this session
  const usedPaymentMethods = Array.from(
    new Set(movements.map((m) => m.paymentMethod))
  );

  // Always include CASH since opening amount is cash
  if (!usedPaymentMethods.includes("CASH")) {
    usedPaymentMethods.unshift("CASH");
  }

  // Calculate expected totals per payment method
  const expectedByMethod: Record<string, number> = {};

  // CASH starts with opening amount
  const openingAmount = session?.openingAmount || 0;
  expectedByMethod["CASH"] = openingAmount;

  // Add income and subtract expenses per method
  for (const method of usedPaymentMethods) {
    if (!expectedByMethod[method]) {
      expectedByMethod[method] = 0;
    }
    const methodIncome = incomeMovements
      .filter((m) => m.paymentMethod === method)
      .reduce((sum, m) => sum + m.amount, 0);
    const methodExpense = expenseMovements
      .filter((m) => m.paymentMethod === method)
      .reduce((sum, m) => sum + m.amount, 0);
    expectedByMethod[method] += methodIncome - methodExpense;
  }

  // Calculate total expected (sum of all methods)
  const totalExpected = Object.values(expectedByMethod).reduce(
    (sum, v) => sum + v,
    0
  );

  // Calculate user totals per method
  const userTotalByMethod: Record<string, number> = {};
  for (const method of usedPaymentMethods) {
    userTotalByMethod[method] = parseFloat(countedAmounts[method] || "0") || 0;
  }
  const userTotal = Object.values(userTotalByMethod).reduce(
    (sum, v) => sum + v,
    0
  );

  // Calculate variance
  const variance = userTotal - totalExpected;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handleClose = async () => {
    if (!session) return;

    // Validate that all payment methods have values
    const hasEmptyFields = usedPaymentMethods.some(
      (method) =>
        !countedAmounts[method] || countedAmounts[method].trim() === ""
    );
    if (hasEmptyFields) {
      setCloseError("Ingresa un monto para cada medio de pago");
      return;
    }

    // For now, the server expects countedCash (just cash)
    // We send the cash amount to maintain compatibility
    const cashCounted = parseFloat(countedAmounts["CASH"] || "0") || 0;

    setIsClosing(true);
    setCloseError(null);

    try {
      const result = await closeCashRegisterSession({
        sessionId: session.id,
        countedCash: cashCounted,
        closingNotes: closingNotes.trim() || undefined,
        userId: "system", // TODO: Get from auth
      });

      if (result.success && result.data) {
        // Data is already serialized by the server action
        const data = result.data as {
          closedBy: string | null;
          expectedCash: number | null;
          countedCash: number | null;
          variance: number | null;
          closingNotes: string | null;
        };
        const closedSession: SerializedSession = {
          ...session,
          status: "CLOSED",
          closedAt: new Date().toISOString(),
          closedBy: data.closedBy || "system",
          expectedCash: data.expectedCash,
          countedCash: data.countedCash,
          variance: data.variance,
          closingNotes: data.closingNotes,
        };
        onSessionClosed(closedSession);
        onClose();
      } else {
        setCloseError(result.error || "Error al cerrar la sesión");
      }
    } catch {
      setCloseError("Error al cerrar la sesión");
    } finally {
      setIsClosing(false);
    }
  };

  if (!session) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="bg-red-500 text-white p-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-semibold">ARQUEO DE CAJA</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-orange-600"
              onClick={loadMovements}
              disabled={isLoading}
            >
              <RefreshCw
                className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-orange-600"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Session Info */}
        <div className="p-4 space-y-3 border-b">
          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
            <span className="text-gray-500">Caja</span>
            <span className="font-medium">{session.cashRegister.name}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
            <span className="text-gray-500">Hora de apertura</span>
            <span className="font-medium">
              {formatDateTime(session.openedAt)}
            </span>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
            <span className="text-gray-500">Creado Por</span>
            <span className="font-medium">{session.openedBy}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
            <span className="text-gray-500">Estado</span>
            <span
              className={cn(
                "font-medium",
                session.status === "OPEN" ? "text-green-600" : "text-gray-600"
              )}
            >
              {session.status === "OPEN" ? "Abierto" : "Cerrado"}
            </span>
          </div>
        </div>

        {/* System Section */}
        <div>
          <div className="bg-gray-400 text-white px-4 py-2 font-semibold text-sm">
            SEGÚN SISTEMA
          </div>

          {/* Opening Amount */}
          <div className="flex justify-between px-4 py-3 border-b">
            <span className="font-medium text-sm">MONTO INICIAL</span>
            <span className="font-medium">{formatCurrency(openingAmount)}</span>
          </div>

          {/* Income Section */}
          <div className="border-b">
            <button
              onClick={() => toggleSection("income")}
              className="flex justify-between items-center w-full px-4 py-3 hover:bg-gray-50"
            >
              <span className="font-medium text-sm">INGRESO</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {formatCurrency(totalIncome)}
                </span>
                {expandedSections.income ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </button>

            {expandedSections.income &&
              Object.entries(incomeByMethod).length > 0 && (
                <div className="bg-gray-50 px-4 pb-3">
                  {Object.entries(incomeByMethod).map(([method, data]) => (
                    <div key={method} className="ml-4">
                      <div className="flex justify-between py-1">
                        <span className="text-orange-500 text-sm flex items-center gap-1">
                          <ChevronDown className="h-3 w-3" />
                          {
                            PAYMENT_METHOD_LABELS[
                              method as keyof typeof PAYMENT_METHOD_LABELS
                            ]
                          }
                        </span>
                        <span className="text-sm">
                          {formatCurrency(data.total)}
                        </span>
                      </div>
                      {data.movements.map((m) => (
                        <div
                          key={m.id}
                          className="flex justify-between py-1 ml-4 text-sm text-gray-600"
                        >
                          <span>
                            {m.type === "SALE"
                              ? "Ventas"
                              : m.description || "Ingreso"}
                          </span>
                          <span>{formatCurrency(m.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Expense Section */}
          <div className="border-b">
            <button
              onClick={() => toggleSection("expense")}
              className="flex justify-between items-center w-full px-4 py-3 hover:bg-gray-50"
            >
              <span className="font-medium text-sm">EGRESO</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  - {formatCurrency(totalExpense)}
                </span>
                {expandedSections.expense ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </button>

            {expandedSections.expense &&
              Object.entries(expenseByMethod).length > 0 && (
                <div className="bg-gray-50 px-4 pb-3">
                  {Object.entries(expenseByMethod).map(([method, data]) => (
                    <div key={method} className="ml-4">
                      <div className="flex justify-between py-1">
                        <span className="text-orange-500 text-sm flex items-center gap-1">
                          <ChevronDown className="h-3 w-3" />
                          {
                            PAYMENT_METHOD_LABELS[
                              method as keyof typeof PAYMENT_METHOD_LABELS
                            ]
                          }
                        </span>
                        <span className="text-sm">
                          - {formatCurrency(data.total)}
                        </span>
                      </div>
                      {data.movements.map((m) => (
                        <div
                          key={m.id}
                          className="flex justify-between py-1 ml-4 text-sm text-gray-600"
                        >
                          <span>
                            {m.type === "REFUND"
                              ? "Devolución"
                              : m.description || "Egreso"}
                          </span>
                          <span>{formatCurrency(m.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* System Total */}
          <div className="flex justify-between px-4 py-3 bg-gray-100 font-semibold">
            <span>Total</span>
            <span>{formatCurrency(totalExpected)}</span>
          </div>
        </div>

        {/* User Section - Only show for OPEN sessions */}
        {session.status === "OPEN" && (
          <div>
            <div className="bg-gray-400 text-white px-4 py-2 font-semibold text-sm">
              SEGÚN USUARIO
            </div>

            <div className="p-4 space-y-4">
              {/* Input for each payment method used */}
              {usedPaymentMethods.map((method) => (
                <div key={method} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={`counted-${method}`}>
                      {
                        PAYMENT_METHOD_LABELS[
                          method as keyof typeof PAYMENT_METHOD_LABELS
                        ]
                      }{" "}
                      *
                    </Label>
                    <span className="text-xs text-gray-500">
                      Esperado: {formatCurrency(expectedByMethod[method] || 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <Input
                      id={`counted-${method}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={countedAmounts[method] || ""}
                      onChange={(e) =>
                        setCountedAmounts((prev) => ({
                          ...prev,
                          [method]: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      disabled={isClosing}
                    />
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <Label htmlFor="closingNotes">Comentario</Label>
                <Textarea
                  id="closingNotes"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Notas de cierre..."
                  rows={3}
                  disabled={isClosing}
                />
              </div>

              {/* User Total */}
              <div className="flex justify-between py-3 bg-gray-100 px-4 -mx-4 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(userTotal)}</span>
              </div>

              {closeError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {closeError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Closed session info */}
        {session.status === "CLOSED" && (
          <div>
            <div className="bg-gray-400 text-white px-4 py-2 font-semibold text-sm">
              SEGÚN USUARIO
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Efectivo contado</span>
                <span className="font-medium">
                  {formatCurrency(session.countedCash || 0)}
                </span>
              </div>
              {session.closingNotes && (
                <div>
                  <span className="text-gray-500 text-sm">Comentario:</span>
                  <p className="text-sm mt-1">{session.closingNotes}</p>
                </div>
              )}
              <div className="flex justify-between py-3 bg-gray-100 px-4 -mx-4 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(session.countedCash || 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Variance Footer */}
        <div
          className={cn(
            "flex justify-between px-4 py-4 font-semibold text-white",
            session.status === "OPEN"
              ? variance < 0
                ? "bg-red-500"
                : variance > 0
                ? "bg-green-500"
                : "bg-gray-500"
              : (session.variance || 0) < 0
              ? "bg-red-500"
              : (session.variance || 0) > 0
              ? "bg-green-500"
              : "bg-gray-500"
          )}
        >
          <span>Diferencia</span>
          <span>
            {session.status === "OPEN"
              ? formatCurrency(variance)
              : formatCurrency(session.variance || 0)}
          </span>
        </div>

        {/* Close Button - Only for OPEN sessions */}
        {session.status === "OPEN" && (
          <div className="p-4">
            <Button
              onClick={handleClose}
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={
                isClosing ||
                usedPaymentMethods.some(
                  (method) =>
                    !countedAmounts[method] ||
                    countedAmounts[method].trim() === ""
                )
              }
            >
              {isClosing ? "Finalizando..." : "Finalizar Arqueo"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
