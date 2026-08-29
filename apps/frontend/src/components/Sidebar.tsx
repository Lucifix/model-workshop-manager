import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ArchiveIcon,
  BeakerIcon,
  BoxIcon,
  CartIcon,
  CloseIcon,
  DatabaseIcon,
  DropletIcon,
  HammerIcon,
  HomeIcon,
  MenuIcon,
} from "./icons";
import type { ComponentType } from "react";
import type { IconProps } from "./icons";
import { useAuthStatus, useLogout } from "../api/client";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
}

interface NavGroup {
  section?: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  { items: [{ to: "/", label: "Dashboard", icon: HomeIcon }] },
  {
    section: "Models",
    items: [
      { to: "/models", label: "Catalog", icon: BoxIcon },
      { to: "/owned-models", label: "My Collection", icon: ArchiveIcon },
    ],
  },
  {
    section: "Paints",
    items: [
      { to: "/paints", label: "Catalog", icon: DropletIcon },
      { to: "/paint-inventory", label: "My Inventory", icon: BeakerIcon },
    ],
  },
  {
    items: [
      { to: "/projects", label: "Builds", icon: HammerIcon },
      { to: "/shopping-list", label: "Shopping List", icon: CartIcon },
      { to: "/import-export", label: "Import & Export", icon: DatabaseIcon },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
      {groups.map((group, i) => (
        <div key={i} className="flex flex-col gap-1">
          {group.section && (
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.section}
            </div>
          )}
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-workshop-accent/15 text-workshop-accent"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function UserFooter() {
  const { data: auth } = useAuthStatus();
  const logout = useLogout();

  return (
    <div className="flex items-center justify-between border-t border-workshop-border px-4 py-3">
      <span className="truncate text-xs text-slate-500">{auth?.username}</span>
      <button
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="text-xs font-medium text-slate-400 hover:text-workshop-accent disabled:opacity-50"
      >
        Sign out
      </button>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-4 py-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-workshop-accent text-white">
        <HammerIcon className="h-[18px] w-[18px]" />
      </span>
      <span className="text-sm font-bold tracking-tight text-slate-50">Workshop Manager</span>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-workshop-border bg-workshop-sidebar/95 px-3 py-2.5 backdrop-blur lg:hidden">
        <Brand />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800/60"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </header>

      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-workshop-border bg-workshop-sidebar lg:flex">
        <Brand />
        <NavLinks />
        <UserFooter />
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-workshop-border bg-workshop-sidebar shadow-xl">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="mr-3 rounded-lg p-2 text-slate-300 hover:bg-slate-800/60"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <UserFooter />
          </aside>
        </div>
      )}
    </>
  );
}
