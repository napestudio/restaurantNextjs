"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { getAvailableProductsForOrder } from "@/actions/Order";

type Product = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: { name: string } | null;
  price: number;
};

interface ProductsContextType {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

interface ProductsProviderProps {
  branchId: string;
  children: ReactNode;
  initialProducts?: Product[];
}

export function ProductsProvider({ branchId, children, initialProducts }: ProductsProviderProps) {
  // Use initial products if provided, avoiding double fetch
  const [products, setProducts] = useState<Product[]>(initialProducts ?? []);
  const [isLoading, setIsLoading] = useState(!initialProducts);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(!!initialProducts);

  const loadProducts = useCallback(async () => {
    if (!branchId) return;

    try {
      setIsLoading(true);
      setError(null);
      const availableProducts = await getAvailableProductsForOrder(branchId);
      setProducts(availableProducts);
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading products");
      console.error("Error loading products:", err);
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  // Only fetch on mount if no initial products provided
  // Using a ref-based approach to avoid useEffect dependency issues
  if (!isInitialized && !isLoading) {
    loadProducts();
  }

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
