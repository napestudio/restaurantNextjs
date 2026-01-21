"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  onSubmitPreOrder?: () => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function ProductPicker({
  products,
  onSelectProduct,
  onSubmitPreOrder,
  label = "Producto",
  placeholder = "Buscar producto...",
  disabled = false,
  autoFocus = false,
}: ProductPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category?.name.toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  // Auto-focus input when component mounts or when autoFocus becomes true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Reset highlighted index when search query changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchQuery]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  const handleSelectProduct = (product: Product) => {
    onSelectProduct(product);
    setSearchQuery("");
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!showSuggestions && searchQuery) {
          setShowSuggestions(true);
        }
        if (filteredProducts.length > 0) {
          setHighlightedIndex((prev) =>
            prev < filteredProducts.length - 1 ? prev + 1 : 0,
          );
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (!showSuggestions && searchQuery) {
          setShowSuggestions(true);
        }
        if (filteredProducts.length > 0) {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredProducts.length - 1,
          );
        }
        break;

      case "Enter":
        e.preventDefault();
        if (
          showSuggestions &&
          highlightedIndex >= 0 &&
          filteredProducts[highlightedIndex]
        ) {
          // Add highlighted item to pre-order
          handleSelectProduct(filteredProducts[highlightedIndex]);
        } else if (!searchQuery && onSubmitPreOrder) {
          // Submit pre-order when input is empty
          onSubmitPreOrder();
        }
        break;

      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="product-search">{label}</Label>
      <div className="relative">
        <Input
          ref={inputRef}
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
            setTimeout(() => {
              setShowSuggestions(false);
              setHighlightedIndex(-1);
            }, 200);
          }}
          onKeyDown={handleKeyDown}
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
              filteredProducts.map((product, index) => (
                <button
                  key={product.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur
                    handleSelectProduct(product);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors",
                    highlightedIndex === index && "bg-blue-100 border-blue-300",
                  )}
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
