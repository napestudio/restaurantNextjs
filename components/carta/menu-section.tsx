import { MenuItem } from "./menu-item";
import { MenuItemGroup } from "./menu-item-group";
import type {
  SerializedMenuSection,
  SerializedMenuItem,
  SerializedMenuItemGroup,
} from "@/actions/menus";

interface MenuSectionProps {
  section: SerializedMenuSection;
  showPrices?: boolean;
}

// Union type for mixed content
type SectionElement =
  | { type: "item"; data: SerializedMenuItem }
  | { type: "group"; data: SerializedMenuItemGroup };

export function MenuSection({ section, showPrices = true }: MenuSectionProps) {
  const ungroupedItems = section.menuItems || [];
  const groups = section.menuItemGroups || [];

  // Build a unified list sorted by order
  const elements: SectionElement[] = [
    ...ungroupedItems.map((item) => ({ type: "item" as const, data: item })),
    ...groups.map((group) => ({ type: "group" as const, data: group })),
  ].sort((a, b) => a.data.order - b.data.order);

  const hasContent = elements.length > 0;

  return (
    <div className="text-white not-first:mt-12 bg-neutral-950 rounded-xl md:p-6 px-0 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-serif">{section.name}</h2>
        {section.description && <p className="mt-2 whitespace-pre-wrap">{section.description}</p>}
      </div>

      <div>
        {hasContent &&
          elements.map((element) =>
            element.type === "item" ? (
              <MenuItem
                key={element.data.id}
                name={element.data.product?.name || "Sin nombre"}
                description={element.data.product?.description}
                imageUrl={element.data.product?.imageUrl}
                price={
                  element.data.customPrice ??
                  element.data.product?.basePrice ??
                  null
                }
                isFeatured={element.data.isFeatured}
                tags={element.data.product?.tags ?? []}
                showPrice={showPrices}
              />
            ) : (
              <MenuItemGroup key={element.data.id} group={element.data} />
            ),
          )}
      </div>
    </div>
  );
}
