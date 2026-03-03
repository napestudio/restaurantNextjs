"use client";

import useSWR from "swr";
import { useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getWaitersForBranch, getCurrentUserId } from "@/actions/users";

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
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
      staleTime: 300000,
    }
  );

  // Fetch current user ID once (heavily cached — same for the entire session)
  const { data: currentUserId } = useSWR("current-user-id", getCurrentUserId, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 300000,
  });

  // Auto-select the logged-in user once when waiters load, if they're in the list
  const defaultAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultAppliedRef.current) return;
    if (!currentUserId || waiters.length === 0) return;
    if (waiters.some((w) => w.id === currentUserId)) {
      onSelectWaiter(currentUserId);
      defaultAppliedRef.current = true;
    }
  }, [currentUserId, waiters, onSelectWaiter]);

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
