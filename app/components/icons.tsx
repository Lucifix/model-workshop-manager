import {
  Archive,
  Beaker,
  Box,
  Camera,
  ChevronDown,
  DollarSign,
  Database,
  Droplet,
  Hammer,
  Heart,
  Home,
  Images,
  Menu,
  MoreHorizontal,
  Settings,
  ShoppingCart,
  Wrench,
  X,
  type LucideProps,
} from "lucide-react";
import type { SVGProps } from "react";

export type IconProps = LucideProps;

const defaults: LucideProps = { strokeWidth: 1.75 };

export function HomeIcon(props: IconProps) {
  return <Home {...defaults} {...props} />;
}

export function BoxIcon(props: IconProps) {
  return <Box {...defaults} {...props} />;
}

export function ChevronDownIcon(props: IconProps) {
  return <ChevronDown {...defaults} {...props} />;
}

export function ArchiveIcon(props: IconProps) {
  return <Archive {...defaults} {...props} />;
}

export function DropletIcon(props: IconProps) {
  return <Droplet {...defaults} {...props} />;
}

export function BeakerIcon(props: IconProps) {
  return <Beaker {...defaults} {...props} />;
}

/** The app's brand mark — same silhouette as the PWA/favicon icon, filled rather than stroked. */
export function ShipIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M3 15c0 0 3 4 9 4s9-4 9-4l-3-3H6l-3 3Z" />
      <rect x="11.3" y="2" width="1.4" height="11" rx="0.7" />
      <path d="M12.7 4v7h6.3L12.7 4Z" />
    </svg>
  );
}

export function HammerIcon(props: IconProps) {
  return <Hammer {...defaults} {...props} />;
}

export function CartIcon(props: IconProps) {
  return <ShoppingCart {...defaults} {...props} />;
}

export function DatabaseIcon(props: IconProps) {
  return <Database {...defaults} {...props} />;
}

export function MenuIcon(props: IconProps) {
  return <Menu {...defaults} {...props} />;
}

export function CloseIcon(props: IconProps) {
  return <X {...defaults} {...props} />;
}

export function HeartIcon(props: IconProps) {
  return <Heart {...defaults} {...props} />;
}

export function DollarIcon(props: IconProps) {
  return <DollarSign {...defaults} {...props} />;
}

export function WrenchIcon(props: IconProps) {
  return <Wrench {...defaults} {...props} />;
}

export function MoreIcon(props: IconProps) {
  return <MoreHorizontal {...defaults} {...props} />;
}

export function SettingsIcon(props: IconProps) {
  return <Settings {...defaults} {...props} />;
}

export function CameraIcon(props: IconProps) {
  return <Camera {...defaults} {...props} />;
}

export function GalleryIcon(props: IconProps) {
  return <Images {...defaults} {...props} />;
}
