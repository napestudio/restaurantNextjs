"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Product = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: { name: string } | null;
  price: number;
};

interface ProductPickerProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function ProductPicker({
  products,
  onSelectProduct,
  label = "Producto",
  placeholder = "Buscar producto...",
  disabled = false,
}: ProductPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category?.name.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleSelectProduct = (product: Product) => {
    onSelectProduct(product);
    setSearchQuery("");
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="product-search">{label}</Label>
      <div className="relative">
        <Input
          id="product-search"
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
        />

        {showSuggestions && searchQuery && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">
                {products.length === 0
                  ? "No hay productos disponibles"
                  : "No se encontraron productos"}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur
                    handleSelectProduct(product);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{product.name}</div>
                      {/* {product.category && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {product.category.name}
                        </div>
                      )} */}
                    </div>
                    <div className="text-sm font-semibold text-gray-700">
                      ${Number(product.price).toFixed(2)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
