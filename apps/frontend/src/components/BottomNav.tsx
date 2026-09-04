import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NavLinks, UserFooter } from "./Sidebar";
import { primaryNavItems, moreNavItems } from "./nav-items";
import { CloseIcon, MoreIcon } from "./icons";

export function BottomNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-workshop-sidebar/70 p-1.5 shadow-lift backdrop-blur-xl">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-full px-3.5 py-2 text-[11px] font-medium transition-colors ${
                  isActive
                    ? "bg-workshop-accent/15 text-workshop-accent"
                    : "text-slate-300 hover:text-slate-100"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="More"
            aria-expanded={open}
            className={`flex flex-col items-center gap-0.5 rounded-full px-3.5 py-2 text-[11px] font-medium transition-colors ${
              open
                ? "bg-workshop-accent/15 text-workshop-accent"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            <MoreIcon className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[75vh] flex-col rounded-t-2xl border-t border-workshop-border bg-workshop-sidebar shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-bold text-slate-50">More</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-slate-300 hover:bg-slate-800/60"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <NavLinks items={moreNavItems} onNavigate={() => setOpen(false)} />
            <UserFooter />
          </div>
        </div>
      )}
    </>
  );
}
