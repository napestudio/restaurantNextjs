"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { CartItem } from "./delivery-page-client";
import { OrderProduct, DeliverySection, DeliveryProduct } from "@/types/products";
import { ProductTagIcons } from "@/components/ui/product-tag-icons";

interface ProductListProps {
  products: OrderProduct[];
  sections?: DeliverySection[];
  onAddToCart: (productId: string, name: string, price: number) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  cart: CartItem[];
}

export function ProductList({
  products,
  sections,
  onAddToCart,
  onUpdateQuantity,
  cart,
}: ProductListProps) {
  const getQuantityInCart = (productId: string): number => {
    const item = cart.find((item) => item.productId === productId);
    return item ? item.quantity : 0;
  };

  const QuantityControl = ({
    productId,
    name,
    price,
    currentQuantity,
    trackStock,
    stock,
  }: {
    productId: string;
    name: string;
    price: number;
    currentQuantity: number;
    trackStock: boolean;
    stock: number;
  }) => {
    const isAtLimit = trackStock && currentQuantity >= stock;

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
          disabled={isAtLimit}
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
          disabled={isAtLimit}
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-white hover:bg-red-600"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const ProductCard = ({ product }: { product: DeliveryProduct | OrderProduct }) => {
    const productId = "productId" in product ? product.productId : product.id;
    const quantity = getQuantityInCart(productId);
    return (
      <div className="bg-white rounded-lg p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="w-20 h-20 bg-gray-200 rounded-md shrink-0 overflow-hidden">
          {product.imageUrl && (
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-black text-lg truncate">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
          )}
          {product.tags.length > 0 && (
            <div className="mt-1">
              <ProductTagIcons tags={product.tags} size={14} />
            </div>
          )}
          <p className="text-lg font-bold text-neutral-900 mt-1">
            ${product.price.toLocaleString("es-AR")}
          </p>
        </div>
        <div className="shrink-0">
          <QuantityControl
            productId={productId}
            name={product.name}
            price={product.price}
            currentQuantity={quantity}
            trackStock={product.trackStock}
            stock={product.stock}
          />
        </div>
      </div>
    );
  };

  // ── Section-based layout (when a delivery menu is configured) ────────────────
  if (sections && sections.length > 0) {
    return (
      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.id}>
            <h2 className="text-2xl font-bold mb-1 text-neutral-900 sticky top-0 px-4 py-2 z-10">
              {section.name}
            </h2>
            {section.description && (
              <p className="text-sm text-gray-500 px-4 mb-3">{section.description}</p>
            )}
            <div className="space-y-3">
              {section.elements.map((element) =>
                element.type === "item" ? (
                  <ProductCard key={element.data.productId} product={element.data} />
                ) : (
                  <div key={element.data.id}>
                    <h3 className="text-lg font-semibold text-neutral-700 px-2 pt-3 pb-1">
                      {element.data.name}
                    </h3>
                    {element.data.description && (
                      <p className="text-xs text-gray-500 px-2 mb-2">
                        {element.data.description}
                      </p>
                    )}
                    <div className="space-y-3">
                      {element.data.items.map((item) => (
                        <ProductCard key={item.productId} product={item} />
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Category-based fallback (no menu configured) ─────────────────────────────
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">
          No hay productos disponibles para delivery
        </p>
      </div>
    );
  }

  const productsByCategory = products.reduce(
    (acc, product) => {
      const categoryName = product.category?.name || "Sin categoría";
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(product);
      return acc;
    },
    {} as Record<string, OrderProduct[]>,
  );

  return (
    <div className="space-y-8">
      {Object.entries(productsByCategory).map(([categoryName, categoryProducts]) => (
        <div key={categoryName}>
          <h2 className="text-2xl font-bold mb-4 text-neutral-900 sticky top-0 px-4 py-2 z-10">
            {categoryName}
          </h2>
          <div className="space-y-3">
            {categoryProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
