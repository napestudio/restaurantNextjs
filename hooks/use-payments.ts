"use client";

import { type PaymentMethodExtended } from "@/actions/Order";
import { useEffect, useMemo, useState } from "react";

export type PaymentLine = {
  id: string;
  method: PaymentMethodExtended;
  amount: string;
};

export function usePayments(total: number) {
  const [payments, setPayments] = useState<PaymentLine[]>([
    { id: "1", method: "CASH", amount: "" },
  ]);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  // When total changes with a single line, keep it in sync.
  // With multiple lines, update the last line to the new remainder.
  useEffect(() => {
    setPayments((prev) => {
      if (prev.length === 1) {
        return [{ ...prev[0], amount: total.toFixed(2) }];
      }
      const allButLast = prev.slice(0, -1);
      const otherTotal = allButLast.reduce(
        (s, p) => s + (parseFloat(p.amount) || 0),
        0,
      );
      const rem = Math.max(0, total - otherTotal);
      return [
        ...allButLast,
        { ...prev[prev.length - 1], amount: rem.toFixed(2) },
      ];
    });
  }, [total]);

  const totalPayment = useMemo(
    () => payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
    [payments],
  );

  const remainder = total - totalPayment;
  const change = Math.max(0, -remainder);

  const addPaymentLine = () => {
    const newId = Date.now().toString();
    const rem = Math.max(0, total - totalPayment);
    setPayments((prev) => [
      ...prev,
      { id: newId, method: "CASH", amount: rem.toFixed(2) },
    ]);
    setLastAddedId(newId);
  };

  const removePaymentLine = (id: string) => {
    setPayments((prev) => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter((p) => p.id !== id);
      if (filtered.length <= 1) return filtered;
      // Recalculate last line after removal
      const allButLast = filtered.slice(0, -1);
      const otherTotal = allButLast.reduce(
        (s, p) => s + (parseFloat(p.amount) || 0),
        0,
      );
      const rem = Math.max(0, total - otherTotal);
      return [
        ...allButLast,
        { ...filtered[filtered.length - 1], amount: rem.toFixed(2) },
      ];
    });
  };

  const updatePaymentLine = (
    id: string,
    field: "method" | "amount",
    value: string,
  ) => {
    setPayments((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, [field]: value } : p));
      // When editing amount on a non-last line, auto-update the last line
      if (field === "amount" && prev.length > 1) {
        const lastLine = prev[prev.length - 1];
        if (id !== lastLine.id) {
          const allButLast = updated.slice(0, -1);
          const otherTotal = allButLast.reduce(
            (s, p) => s + (parseFloat(p.amount) || 0),
            0,
          );
          const rem = Math.max(0, total - otherTotal);
          return [
            ...allButLast,
            { ...updated[updated.length - 1], amount: rem.toFixed(2) },
          ];
        }
      }
      return updated;
    });
  };

  const resetPayments = (newTotal: number) => {
    setPayments([{ id: "1", method: "CASH", amount: newTotal.toFixed(2) }]);
    setLastAddedId(null);
  };

  return {
    payments,
    lastAddedId,
    remainder,
    change,
    addPaymentLine,
    removePaymentLine,
    updatePaymentLine,
    resetPayments,
  };
}
