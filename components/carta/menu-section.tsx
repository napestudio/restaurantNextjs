import { MenuItem } from "./menu-item";
import type { SerializedMenuSection } from "@/actions/menus";

interface MenuSectionProps {
  section: SerializedMenuSection;
}

export function MenuSection({ section }: MenuSectionProps) {
  return (
    <div className="text-white not-first:mt-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-serif">{section.name}</h2>
        {section.description && <p className="mt-2">{section.description}</p>}
      </div>

      <div className="space-y-6">
        {section.menuItems && section.menuItems.length > 0 ? (
          section.menuItems.map((item) => (
            <MenuItem
              key={item.id}
              name={item.product?.name || "Sin nombre"}
              description={item.product?.description}
              imageUrl={item.product?.imageUrl}
              price={item.customPrice ?? item.product?.basePrice ?? null}
              isFeatured={item.isFeatured}
            />
          ))
        ) : (
          <p className="text-neutral-500 text-center py-4">
            No hay productos disponibles en esta sección
          </p>
        )}
      </div>
    </div>
  );
}
