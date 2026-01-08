import { MenuItem } from "./menu-item";
import type { SerializedMenuItemGroup } from "@/actions/menus";

interface MenuItemGroupProps {
  group: SerializedMenuItemGroup;
}

export function MenuItemGroup({ group }: MenuItemGroupProps) {
  const items = group.menuItems || [];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 py-2 mt-4">
      {/* Group header */}
      <div className="pl-4">
        <h3 className="text-2xl font-bold text-neutral-200 font-serif">
          {group.name}
        </h3>
        {group.description && (
          <p className="text-sm text-neutral-400 mt-1">{group.description}</p>
        )}
      </div>

      {/* Group items */}
      <div className="pl-4">
        {items.map((item) => (
          <MenuItem
            key={item.id}
            name={item.product?.name || "Sin nombre"}
            description={item.product?.description}
            imageUrl={item.product?.imageUrl}
            price={item.customPrice ?? item.product?.basePrice ?? null}
            isFeatured={item.isFeatured}
          />
        ))}
      </div>
    </div>
  );
}
