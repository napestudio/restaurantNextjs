"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { getAvailableProductsForOrder } from "@/actions/Order";
import { OrderType } from "@/app/generated/prisma";
import { OrderProduct } from "@/types/products";

interface ProductsContextType {
  products: OrderProduct[];
  isLoading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

interface ProductsProviderProps {
  branchId: string;
  orderType: OrderType;
  children: ReactNode;
  initialProducts?: OrderProduct[];
}

export function ProductsProvider({ branchId, orderType, children, initialProducts }: ProductsProviderProps) {
  // Use initial products if provided, otherwise start empty (loaded on demand)
  const [products, setProducts] = useState<OrderProduct[]>(initialProducts ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!branchId) return;

    try {
      setIsLoading(true);
      setError(null);
      const availableProducts = await getAvailableProductsForOrder(branchId, orderType);
      setProducts(availableProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading products");
      console.error("Error loading products:", err);
    } finally {
      setIsLoading(false);
    }
  }, [branchId, orderType]);

  // Sync with initialProducts if provided from server
  useEffect(() => {
    if (initialProducts) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  // Clear cached products when orderType changes so the sidebar reloads for the new type
  useEffect(() => {
    setProducts([]);
  }, [orderType]);

  const refreshProducts = useCallback(async () => {
    await loadProducts();
  }, [loadProducts]);

  return (
    <ProductsContext.Provider
      value={{
        products,
        isLoading,
        error,
        refreshProducts,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductsProvider");
  }
  return context;
}
