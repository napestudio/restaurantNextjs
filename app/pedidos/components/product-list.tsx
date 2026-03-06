"use client";

import { formatCurrency } from "@/lib/currency";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { CartItem } from "./delivery-page-client";
import {
  OrderProduct,
  DeliverySection,
  DeliveryProduct,
} from "@/types/products";
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
          className="bg-white hover:bg-white/50  text-neutral-900 font-bold rounded-full text-2xl w-8 h-8 flex items-center justify-center leading-0"
        >
          <Plus className="h-2 w-2" />
        </Button>
      );
    }

    return (
      <div className="w-full flex justify-between items-center mx-auto self-center bg-white rounded-md">
        <Button
          onClick={handleDecrease}
          size="icon"
          variant="ghost"
          className="mx-auto h-8 w-3 flex-1 text-black font-bold hover:bg-white"
        >
          <Minus className="h-2 w-2" />
        </Button>
        <span className="text-black font-semibold min-w-6 text-center">
          {currentQuantity}
        </span>
        <Button
          onClick={handleIncrease}
          disabled={isAtLimit}
          size="icon"
          variant="ghost"
          className="mx-auto h-8 w-3 flex-1 text-black font-bold hover:bg-white"
        >
          <Plus className="h-2 w-2" />
        </Button>
      </div>
    );
  };

  const ProductCard = ({
    product,
  }: {
    product: DeliveryProduct | OrderProduct;
  }) => {
    const productId = "productId" in product ? product.productId : product.id;
    const quantity = getQuantityInCart(productId);
    return (
      <div className="bg-white rounded-lg p-4 flex items-start gap-4 hover:shadow-md transition-shadow">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-black text-lg gap-1">
            {product.name}{" "}
            {product.tags.length > 0 && (
              <div className="inline-flex items-center gap-1">
                <ProductTagIcons tags={product.tags} size={18} />
              </div>
            )}
          </h3>
          {product.description && (
            <p className="text-sm text-gray-600 ">{product.description}</p>
          )}

          <p className="text-lg font-bold text-neutral-900 mt-1">
            {formatCurrency(product.price)}
          </p>
        </div>
        <div className="w-25 h-25 md:w-30 md:h-30 bg-gray-200 rounded-md shrink-0 relative overflow-hidden">
          <div className="w-full absolute flex items-end justify-end bottom-1 px-1">
            <QuantityControl
              productId={productId}
              name={product.name}
              price={product.price}
              currentQuantity={quantity}
              trackStock={product.trackStock}
              stock={product.stock}
            />
          </div>
          {product.imageUrl && (
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={200}
              height={200}
              className="w-full h-full object-cover"
            />
          )}
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
            <h2 className="text-3xl font-bold mb-1 text-neutral-900 bg-white/50 backdrop-blur-sm sticky top-0 px-4 py-2 z-10">
              {section.name}
            </h2>
            {section.description && (
              <p className="text-sm text-gray-500 px-4 mb-3">
                {section.description}
              </p>
            )}
            <div className="space-y-3">
              {section.elements.map((element) =>
                element.type === "item" ? (
                  <ProductCard
                    key={element.data.productId}
                    product={element.data}
                  />
                ) : (
                  <div key={element.data.id}>
                    <h3 className="text-2xl font-bold text-neutral-700 px-2 pt-3 pb-1">
                      {element.data.name}
                    </h3>
                    {element.data.description && (
                      <p className="text-sm text-gray-500 px-2 mb-2">
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
      {Object.entries(productsByCategory).map(
        ([categoryName, categoryProducts]) => (
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
        ),
      )}
    </div>
  );
}
