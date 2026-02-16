import Image from "next/image";
import StarIcon from "../ui/star-icon";

interface MenuItemProps {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  isFeatured?: boolean;
}

export function MenuItem({
  name,
  description,
  imageUrl,
  price,
  isFeatured = false,
}: MenuItemProps) {
  return (
    <div className="flex gap-4 group py-2 px-4">
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
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg text-white">
            {name}
            {isFeatured && (
              <span className="ml-2 text-yellow-400 rounded-full inline-block">
                <StarIcon />
              </span>
            )}
          </h3>
          <div className="flex-1 h-px w-full bg-white/50 mb-1.5 self-end"></div>
          {price !== null && price !== undefined && (
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
      </div>
    </div>
  );
}
