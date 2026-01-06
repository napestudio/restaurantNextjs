"use client";

import useSWR from "swr";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getWaitersForBranch } from "@/actions/users";

interface WaiterPickerProps {
  branchId: string;
  selectedWaiterId: string | null;
  onSelectWaiter: (waiterId: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

// SWR fetcher for waiters
const fetchWaiters = async (branchId: string) => {
  const result = await getWaitersForBranch(branchId);
  if (result.success && result.data) {
    return result.data;
  }
  return [];
};

export function WaiterPicker({
  branchId,
  selectedWaiterId,
  onSelectWaiter,
  label = "Camarero",
  placeholder = "Seleccionar camarero",
  disabled = false,
}: WaiterPickerProps) {
  // Use SWR for caching waiters data across component mounts
  const { data: waiters = [], isLoading } = useSWR(
    branchId ? `waiters-${branchId}` : null,
    () => fetchWaiters(branchId),
    {
      revalidateOnFocus: false, // Don't refetch when tab regains focus
      revalidateOnReconnect: false, // Don't refetch on reconnect
      dedupingInterval: 60000, // Dedupe requests within 1 minute
      staleTime: 300000, // Consider data fresh for 5 minutes
    }
  );

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
