"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getWaitersForBranch, type WaiterData } from "@/actions/users";

interface WaiterPickerProps {
  branchId: string;
  selectedWaiterId: string | null;
  onSelectWaiter: (waiterId: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function WaiterPicker({
  branchId,
  selectedWaiterId,
  onSelectWaiter,
  label = "Camarero",
  placeholder = "Seleccionar camarero",
  disabled = false,
}: WaiterPickerProps) {
  const [waiters, setWaiters] = useState<WaiterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWaiters() {
      setIsLoading(true);
      const result = await getWaitersForBranch(branchId);
      if (result.success && result.data) {
        setWaiters(result.data);
      }
      setIsLoading(false);
    }

    fetchWaiters();
  }, [branchId]);

  const handleValueChange = (value: string) => {
    if (value === "__none__") {
      onSelectWaiter(null);
    } else {
      onSelectWaiter(value);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={selectedWaiterId || "__none__"}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? "Cargando..." : placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">
            <span className="text-gray-500">Sin asignar</span>
          </SelectItem>
          {waiters.map((waiter) => (
            <SelectItem key={waiter.id} value={waiter.id}>
              {waiter.name || waiter.username}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
