import type { ProductTag } from "@/app/generated/prisma";
import { SpicyIcon } from "./tag-icons/SpicyIcon";
import { SpicyMediumIcon } from "./tag-icons/SpicyMediumIcon";
import { SpicyHighIcon } from "./tag-icons/SpicyHighIcon";
import { VeganIcon } from "./tag-icons/VeganIcon";
import { VegetarianIcon } from "./tag-icons/VegetarianIcon";
import { GlutenFreeIcon } from "./tag-icons/GlutenFreeIcon";
import { DairyFreeIcon } from "./tag-icons/DairyFreeIcon";
import { NutFreeIcon } from "./tag-icons/NutFreeIcon";
import { NewIcon } from "./tag-icons/NewIcon";
import { PopularIcon } from "./tag-icons/PopularIcon";

const TAG_CONFIG: Record<
  ProductTag,
  {
    label: string;
    icon: React.FC<{ size?: number; className?: string }>;
    color: string;
  }
> = {
  SPICY: {
    label: "Picante Leve",
    icon: SpicyIcon,
    color: "text-neutral-300",
  },
  SPICY_MEDIUM: {
    label: "Picante Medio",
    icon: SpicyMediumIcon,
    color: "text-neutral-300",
  },
  SPICY_HIGH: {
    label: "Muy Picante",
    icon: SpicyHighIcon,
    color: "text-neutral-300",
  },
  VEGAN: {
    label: "Vegano",
    icon: VeganIcon,
    color: "text-green-600",
  },
  VEGETARIAN: {
    label: "Vegetariano",
    icon: VegetarianIcon,
    color: "text-emerald-500",
  },
  GLUTEN_FREE: {
    label: "Sin TACC",
    icon: GlutenFreeIcon,
    color: "text-amber-500",
  },
  DAIRY_FREE: {
    label: "Sin Lácteos",
    icon: DairyFreeIcon,
    color: "text-blue-500",
  },
  NUT_FREE: {
    label: "Sin Frutos Secos",
    icon: NutFreeIcon,
    color: "text-orange-500",
  },
  NEW: {
    label: "Nuevo",
    icon: NewIcon,
    color: "text-purple-500",
  },
  POPULAR: {
    label: "Popular",
    icon: PopularIcon,
    color: "text-orange-400",
  },
};

interface ProductTagIconsProps {
  tags: ProductTag[];
  size?: number;
  showLabel?: boolean;
}

export function ProductTagIcons({
  tags,
  size = 16,
  showLabel = false,
}: ProductTagIconsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const config = TAG_CONFIG[tag];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <span
            key={tag}
            title={config.label}
            className={`inline-flex items-center gap-1 ${config.color}`}
          >
            <Icon size={size} />
            {showLabel && (
              <span className="text-xs font-medium">{config.label}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
