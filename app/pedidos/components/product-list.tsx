"use client";

import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { CartItem } from "./delivery-page-client";

interface Product {
  id: string;
  name: string;
  description: string | null;
  category?: {
    name: string;
  };
  price: number;
}

interface ProductListProps {
  products: Product[];
  onAddToCart: (productId: string, name: string, price: number) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  cart: CartItem[];
}

export function ProductList({
  products,
  onAddToCart,
  onUpdateQuantity,
  cart,
}: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">
          No hay productos disponibles para delivery
        </p>
      </div>
    );
  }

  // Group products by category
  const productsByCategory = products.reduce(
    (acc, product) => {
      const categoryName = product.category?.name || "Sin categoría";
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(product);
      return acc;
    },
    {} as Record<string, Product[]>,
  );

  const getQuantityInCart = (productId: string): number => {
    const item = cart.find((item) => item.productId === productId);
    return item ? item.quantity : 0;
  };

  const QuantityControl = ({
    productId,
    name,
    price,
    currentQuantity,
  }: {
    productId: string;
    name: string;
    price: number;
    currentQuantity: number;
  }) => {
    const handleIncrease = () => {
      if (currentQuantity === 0) {
        onAddToCart(productId, name, price);
      } else {
        onUpdateQuantity(productId, currentQuantity + 1);
      }
    };

    const handleDecrease = () => {
      onUpdateQuantity(productId, currentQuantity - 1);
    };

    if (currentQuantity === 0) {
      return (
        <Button
          onClick={handleIncrease}
          size="sm"
          className="bg-red-500 hover:bg-red-600 text-white font-semibold text-xl px-3"
        >
          +
        </Button>
      );
    }

    return (
      <div className="flex items-center gap-2 bg-red-500 rounded-md">
        <Button
          onClick={handleDecrease}
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-white hover:bg-red-600"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-white font-semibold min-w-8 text-center">
          {currentQuantity}
        </span>
        <Button
          onClick={handleIncrease}
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-white hover:bg-red-600"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {Object.entries(productsByCategory).map(
        ([categoryName, categoryProducts]) => (
          <div key={categoryName}>
            <h2 className="text-2xl font-bold mb-4 text-white sticky top-0 bg-black py-2 z-10">
              {categoryName}
            </h2>
            <div className="space-y-3">
              {categoryProducts.map((product) => {
                const quantity = getQuantityInCart(product.id);
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                  >
                    {/* Product Image Placeholder */}
                    <div className="w-20 h-20 bg-gray-200 rounded-md shrink-0 flex items-center justify-center">
                      <span className="text-gray-400 text-xs text-center px-1">
                        Sin imagen
                      </span>
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-black text-lg mb-1 truncate">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {product.description}
                        </p>
                      )}
                      <p className="text-lg font-bold text-red-500">
                        ${product.price.toFixed(2)}
                      </p>
                    </div>

                    {/* Quantity Control */}
                    <div className="shrink-0">
                      <QuantityControl
                        productId={product.id}
                        name={product.name}
                        price={product.price}
                        currentQuantity={quantity}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
