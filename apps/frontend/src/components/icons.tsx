import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 9.5V19a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V19a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function BoxIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M21 8.5V16a1 1 0 0 1-.5.87l-8 4.5a1 1 0 0 1-1 0l-8-4.5A1 1 0 0 1 3 16V8.5" />
      <path d="M3 8.5 12 3l9 5.5-9 5.5-9-5.5Z" />
      <path d="M12 14v7.4" />
    </svg>
  );
}

export function ArchiveIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="4.5" rx="1" />
      <path d="M4.5 8.5V19a1 1 0 0 0 1 1H18.5a1 1 0 0 0 1-1V8.5" />
      <path d="M10 13h4" />
    </svg>
  );
}

export function DropletIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5s6 6.7 6 11a6 6 0 0 1-12 0c0-4.3 6-11 6-11Z" />
    </svg>
  );
}

export function BeakerIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 3h5" />
      <path d="M10.25 3v6.2L5.6 17.4A1.8 1.8 0 0 0 7.16 20h9.68a1.8 1.8 0 0 0 1.56-2.6L13.75 9.2V3" />
      <path d="M8 15h8" />
    </svg>
  );
}

/** The app's brand mark — same silhouette as the PWA/favicon icon, filled rather than stroked. */
export function ShipIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M3 15c0 0 3 4 9 4s9-4 9-4l-3-3H6l-3 3Z" />
      <rect x="11.3" y="2" width="1.4" height="11" rx="0.7" />
      <path d="M12.7 4v7h6.3L12.7 4Z" />
    </svg>
  );
}

export function HammerIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 5.5 17 3l4 4-2.5 2.5" />
      <path d="M14.9 8.6 5.5 18a1.8 1.8 0 0 0 2.5 2.5l9.4-9.4" />
      <path d="M12.5 6.5l5 5" />
    </svg>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17.5" cy="20" r="1.4" />
      <path d="M2.5 3h2.3l2.1 11.4a1.8 1.8 0 0 0 1.8 1.5H18a1.8 1.8 0 0 0 1.75-1.4L21.5 7H6" />
    </svg>
  );
}

export function DatabaseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="2.5" />
      <path d="M4.5 5.5V18c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5V5.5" />
      <path d="M4.5 11.75c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5h16" />
      <path d="M4 12h16" />
      <path d="M4 17.5h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5 5 14 14" />
      <path d="m19 5-14 14" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20.5s-7.5-4.7-10-9.6C.4 7.4 2.2 4 5.7 4c2 0 3.7 1.1 4.6 2.7C11.2 5.1 12.9 4 14.9 4c3.5 0 5.3 3.4 3.7 6.9-2.5 4.9-10 9.6-10 9.6Z" />
    </svg>
  );
}

export function DollarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.5v19" />
      <path d="M16.5 6.5c0-1.7-2-3-4.5-3S7.5 4.8 7.5 6.5 9.5 9.5 12 9.5s4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3" />
    </svg>
  );
}

export function WrenchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 4.9L3.5 17a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 4.9-5.4l-2.6 2.6-2.1-.6-.6-2.1 2.6-2.6Z" />
    </svg>
  );
}
