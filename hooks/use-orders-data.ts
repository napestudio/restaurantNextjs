"use client";

import useSWR from "swr";
import { getTableOrder, getTableOrders } from "@/actions/Order";
import type { Order } from "@/app/generated/prisma";

type OrderWithItems = Order & {
  items: Array<{
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    price: number;
    originalPrice: number | null;
    notes?: string | null;
    product: {
      id: string;
      name: string;
      description: string | null;
    };
  }>;
  client?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  assignedTo?: {
    id: string;
    name: string | null;
    username: string;
  } | null;
};

interface UseOrdersDataOptions {
  tableId: string | null;
  isShared: boolean;
  /**
   * Polling interval in milliseconds. Set to 0 to disable polling.
   * Default: 30000 (30 seconds)
   */
  refreshInterval?: number;
  /**
   * Whether to revalidate when window regains focus
   * Default: true
   */
  revalidateOnFocus?: boolean;
  /**
   * Whether to revalidate when network reconnects
   * Default: true
   */
  revalidateOnReconnect?: boolean;
}

/**
 * Custom hook for fetching and managing order data with SWR
 *
 * Features:
 * - Automatic polling for fresh data (configurable interval)
 * - Revalidates when browser tab becomes visible
 * - Revalidates when network reconnects
 * - Optimistic updates support via mutate
 * - Automatic caching and deduplication
 *
 * @example
 * const { orders, order, isLoading, error, refresh, mutate } = useOrdersData({
 *   tableId: "table-123",
 *   isShared: true,
 *   refreshInterval: 30000, // Poll every 30 seconds
 * });
 */
export function useOrdersData({
  tableId,
  isShared,
  refreshInterval = 30000,
  revalidateOnFocus = true,
  revalidateOnReconnect = true,
}: UseOrdersDataOptions) {
  // Generate a stable cache key
  const cacheKey = tableId
    ? isShared
      ? `orders-shared-${tableId}`
      : `orders-single-${tableId}`
    : null;

  // Fetcher function - only called when cacheKey is not null
  const fetcher = async () => {
    if (!tableId) return null;

    if (isShared) {
      const result = await getTableOrders(tableId);
      return result.success && result.data ? result.data : [];
    } else {
      const result = await getTableOrder(tableId);
      return result.success && result.data ? result.data : null;
    }
  };

  // Use SWR with configuration
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    cacheKey,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect,
      // Keep previous data while revalidating for smoother UX
      keepPreviousData: true,
      // Deduplicate requests within 2 seconds
      dedupingInterval: 2000,
      // Retry on error with exponential backoff
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  return {
    // For shared tables: array of orders
    // For single tables: single order or null
    orders: isShared ? (data as OrderWithItems[] | undefined) ?? [] : null,
    order: !isShared ? (data as OrderWithItems | null | undefined) ?? null : null,
    isLoading,
    isValidating,
    error: error?.message ?? null,
    // Manual refresh function - returns promise for proper awaiting
    refresh: () => mutate(),
    // Mutate function for optimistic updates
    mutate,
  };
}
