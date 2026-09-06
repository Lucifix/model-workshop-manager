import { NavLink, Link } from "react-router-dom";
import { ShipIcon } from "./icons";
import { useAuthStatus, useLogout } from "../api/client";
import { navItems } from "./nav-items";
import type { NavItem } from "./nav-items";

export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {items.map((item) => (
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
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function UserFooter() {
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

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      to="/"
      onClick={onNavigate}
      className="flex items-center gap-2 rounded-lg px-4 py-4 transition-opacity hover:opacity-80"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-workshop-accent text-white">
        <ShipIcon className="h-[18px] w-[18px]" />
      </span>
      <span className="text-sm font-bold tracking-tight text-slate-50">Workshop Manager</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-workshop-border bg-workshop-sidebar lg:flex">
      <Brand />
      <NavLinks items={navItems} />
      <UserFooter />
    </aside>
  );
}
