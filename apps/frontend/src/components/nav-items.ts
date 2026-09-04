import type { ComponentType } from "react";
import {
  BoxIcon,
  CartIcon,
  DatabaseIcon,
  DropletIcon,
  HammerIcon,
  HeartIcon,
  HomeIcon,
  WrenchIcon,
} from "./icons";
import type { IconProps } from "./icons";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
}

export const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: HomeIcon },
  { to: "/models", label: "Models", icon: BoxIcon },
  { to: "/paints", label: "Paints", icon: DropletIcon },
  { to: "/projects", label: "Builds", icon: HammerIcon },
  { to: "/shopping-list", label: "Shopping List", icon: CartIcon },
  { to: "/wishlist", label: "Wishlist", icon: HeartIcon },
  { to: "/supplies", label: "Supplies", icon: WrenchIcon },
  { to: "/import-export", label: "Import & Export", icon: DatabaseIcon },
];

/** The four most-used sections, shown as tabs in the mobile bottom nav. */
export const primaryNavItems = navItems.slice(0, 4);

/** Remaining sections, tucked behind the bottom nav's "More" sheet. */
export const moreNavItems = navItems.slice(4);
