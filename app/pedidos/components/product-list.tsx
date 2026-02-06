"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Check } from "lucide-react";
import { CartItem } from "./delivery-page-client";

interface Product {
  id: string;
  name: string;
  description?: string;
  category?: {
    name: string;
  };
  price: number;
}

interface ProductListProps {
  products: Product[];
  onAddToCart: (productId: string, name: string, price: number) => void;
  cart: CartItem[];
}

export function ProductList({ products, onAddToCart, cart }: ProductListProps) {
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
  const productsByCategory = products.reduce((acc, product) => {
    const categoryName = product.category?.name || "Sin categoría";
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const isInCart = (productId: string) => {
    return cart.some((item) => item.productId === productId);
  };

  return (
    <div className="space-y-8">
      {Object.entries(productsByCategory).map(([categoryName, categoryProducts]) => (
        <div key={categoryName}>
          <h2 className="text-2xl font-bold mb-4 text-white">{categoryName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryProducts.map((product) => (
              <Card
                key={product.id}
                className="bg-white text-black hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  {product.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {product.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-red-500">
                      ${product.price.toFixed(2)}
                    </span>
                    <Button
                      onClick={() =>
                        onAddToCart(product.id, product.name, product.price)
                      }
                      size="sm"
                      className={
                        isInCart(product.id)
                          ? "bg-green-500 hover:bg-green-600"
                          : ""
                      }
                    >
                      {isInCart(product.id) ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Agregado
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
