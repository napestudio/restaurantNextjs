import type { ProductTag } from "@/app/generated/prisma";
import Image from "next/image";
import { ProductTagIcons } from "../ui/product-tag-icons";

interface MenuItemProps {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  isFeatured?: boolean;
  tags?: ProductTag[];
  showPrice?: boolean;
}

export function MenuItem({
  name,
  description,
  imageUrl,
  price,
  showPrice = true,
  isFeatured = false,
  tags = [],
}: MenuItemProps) {
  return (
    <div className="flex gap-4 group py-2 md:px-4">
      {imageUrl && (
        <div className="shrink-0">
          <Image
            src={imageUrl}
            alt={name}
            width={96}
            height={96}
            className="w-24 h-24 object-cover rounded-lg"
          />
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-full justify-between py-3">
        <div className="flex  items-start justify-between gap-2">
          <h3 className="font-semibold text-lg text-white">
            <div className="flex md:flex-row flex-col gap-1 items-center">
              {name}
              {tags.length > 0 && (
                <div className="mt-1.5 hidden md:block">
                  <ProductTagIcons tags={tags} size={20} />
                </div>
              )}
            </div>

            {/* {isFeatured && (
              <span className="ml-2 text-yellow-400 rounded-full inline-block">
                <StarIcon />
              </span>
            )} */}
          </h3>
          <div className="flex-1 h-px w-full bg-white/50 mb-1.5 self-end"></div>
          {price !== null &&
            price !== undefined &&
            price !== 0 &&
            showPrice && (
              <span className="font-bold text-lg text-white shrink-0">
                ${price}
              </span>
            )}
        </div>
        {description && (
          <p className="text-neutral-400 text-sm mt-1 line-clamp-2">
            {description}
          </p>
        )}
        {tags.length > 0 && (
          <div className="mt-1.5 block md:hidden">
            <ProductTagIcons tags={tags} size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
