import type { Menu, MenuItem, MenuSection, MenuItemGroup } from "@/app/generated/prisma";

export type SerializedMenu = Omit<
  Menu,
  "createdAt" | "updatedAt" | "availableFrom" | "availableUntil"
> & {
  createdAt: string;
  updatedAt: string;
  availableFrom: string | null;
  availableUntil: string | null;
  menuSections?: SerializedMenuSection[];
};

export type SerializedMenuSection = Omit<
  MenuSection,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
  menuItems?: SerializedMenuItem[];
  menuItemGroups?: SerializedMenuItemGroup[];
};

export type SerializedMenuItemGroup = Omit<
  MenuItemGroup,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
  menuItems?: SerializedMenuItem[];
};

export type SerializedMenuItem = Omit<
  MenuItem,
  "createdAt" | "updatedAt" | "customPrice"
> & {
  createdAt: string;
  updatedAt: string;
  customPrice: number | null;
  menuItemGroupId: string | null;
  product?: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    categoryId: string | null;
    basePrice?: number | null; // Price from ProductOnBranch for the menu's branch
  };
};
